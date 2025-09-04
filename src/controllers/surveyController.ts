import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/database';
import { AuthRequest } from '../types/express';

export const createSurveyValidation = [
  body('title').isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('targetAgeMin').isInt({ min: 1, max: 120 }).withMessage('Minimum age must be between 1 and 120'),
  body('targetAgeMax').isInt({ min: 1, max: 120 }).withMessage('Maximum age must be between 1 and 120'),
  body('targetGender').isIn(['MALE', 'FEMALE', 'ALL']).withMessage('Invalid target gender'),
  body('rewardPerResponse').isInt({ min: 1000 }).withMessage('Reward per response must be at least 1000'),
  body('maxParticipants').isInt({ min: 10 }).withMessage('Max participants must be at least 10'),
  body('totalBudget').optional().isFloat({ min: 0 }).withMessage('Total budget must be positive'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('customSteps').optional().isArray().withMessage('Custom steps must be an array')
];

export const createSurvey = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user || req.user.role !== 'SELLER') {
      return res.status(403).json({ error: 'Only sellers can create surveys' });
    }

    const { 
      title, 
      storeName,
      description, 
      url, 
      targetAgeMin, 
      targetAgeMax, 
      targetGender, 
      rewardPerResponse,
      maxParticipants,
      totalBudget,
      endDate, 
      templateId, 
      customSteps,
      status 
    } = req.body;

    console.log('Received survey data:', {
      title,
      rewardPerResponse,
      maxParticipants,
      totalBudget,
      customSteps: customSteps ? 'present' : 'not provided',
      status
    });

    console.log('User info for survey creation:', req.user);

    if (targetAgeMin > targetAgeMax) {
      return res.status(400).json({ error: 'Minimum age cannot be greater than maximum age' });
    }

    // 추가 검증
    if (!storeName || storeName.trim().length === 0) {
      return res.status(400).json({ error: '판매자 스토어 이름은 필수입니다.' });
    }

    if (rewardPerResponse < 1000) {
      return res.status(400).json({ error: '건당 리워드는 최소 1,000원 이상이어야 합니다.' });
    }

    if (maxParticipants < 10) {
      return res.status(400).json({ error: '진행 인원은 최소 10명 이상이어야 합니다.' });
    }

    // 템플릿 ID가 제공되지 않으면 기본 템플릿 사용
    let finalTemplateId = templateId;
    if (!finalTemplateId) {
      const defaultTemplate = await prisma.surveyTemplate.findFirst({
        where: { isDefault: true }
      });
      
      if (!defaultTemplate) {
        return res.status(400).json({ error: 'No default template found' });
      }
      
      finalTemplateId = defaultTemplate.id;
    }

    // 총 예산 계산 (수수료 10% 포함)
    const calculatedTotalBudget = totalBudget || Math.round(rewardPerResponse * maxParticipants * 1.1);

    const survey = await prisma.survey.create({
      data: {
        title,
        storeName: storeName || '',
        description: description || '',
        url,
        sellerId: req.user.id,
        templateId: finalTemplateId,
        targetAgeMin,
        targetAgeMax,
        targetGender,
        reward: rewardPerResponse, // 건당 리워드 금액
        maxParticipants,
        totalBudget: calculatedTotalBudget,
        customSteps: customSteps || null,
        status: 'PENDING', // 관리자 승인 대기 상태
        endDate: new Date(endDate)
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        template: {
          include: {
            steps: {
              include: {
                questions: {
                  include: {
                    options: true
                  },
                  orderBy: { questionNumber: 'asc' }
                }
              },
              orderBy: { stepNumber: 'asc' }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Survey created successfully',
      survey
    });

  } catch (error: any) {
    console.error('Create survey error:', error);
    
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        error: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.',
        code: 'INVALID_USER'
      });
    }
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: '중복된 데이터입니다.',
        code: 'DUPLICATE_DATA'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred'
    });
  }
};

export const getSurveys = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let where: any = {};

    console.log('User info:', req.user); // 디버깅용 로그

    if (req.user?.role === 'SELLER') {
      where.sellerId = req.user.id;
    } else if (req.user?.role === 'CONSUMER') {
      where.status = 'APPROVED';
      where.endDate = { gte: new Date() };
      
      // Calculate age from birthDate
      if (req.user.birthDate) {
        const today = new Date();
        const birthDate = new Date(req.user.birthDate);
        const age = today.getFullYear() - birthDate.getFullYear();
        
        where.targetAgeMin = { lte: age };
        where.targetAgeMax = { gte: age };
      }
      
      if (req.user.gender && (req.user.gender === 'MALE' || req.user.gender === 'FEMALE')) {
        where.OR = [
          { targetGender: req.user.gender },
          { targetGender: 'ALL' }
        ];
      }
    }

    console.log('Query where condition:', JSON.stringify(where, null, 2)); // 디버깅용 로그

    if (status) {
      where.status = status;
    }

    const surveys = await prisma.survey.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true
          }
        },
        template: {
          select: {
            id: true,
            name: true
          }
        },
        responses: {
          select: {
            id: true,
            consumerId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 응답 수가 포함된 설문 목록 생성
    const surveysWithResponseCount = surveys.map(survey => ({
      ...survey,
      responseCount: survey.responses?.length || 0
    }));

    res.json({ surveys: surveysWithResponseCount });

  } catch (error) {
    console.error('Get surveys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSurvey = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        template: {
          include: {
            steps: {
              include: {
                questions: {
                  include: {
                    options: {
                      orderBy: { optionNumber: 'asc' }
                    }
                  },
                  orderBy: { questionNumber: 'asc' }
                }
              },
              orderBy: { stepNumber: 'asc' }
            }
          }
        },
        responses: {
          include: {
            consumer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Check access permissions
    if (req.user?.role === 'SELLER' && survey.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user?.role === 'CONSUMER' && survey.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Survey not available' });
    }

    res.json({ survey });

  } catch (error) {
    console.error('Get survey error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.surveyTemplate.findMany({
      include: {
        steps: {
          include: {
            questions: {
              include: {
                options: {
                  orderBy: { optionNumber: 'asc' }
                }
              },
              orderBy: { questionNumber: 'asc' }
            }
          },
          orderBy: { stepNumber: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSurvey = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.user || req.user.role !== 'SELLER') {
      return res.status(403).json({ error: 'Only sellers can update surveys' });
    }

    const survey = await prisma.survey.findUnique({
      where: { id }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    if (survey.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedSurvey = await prisma.survey.update({
      where: { id },
      data: { status },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        template: {
          include: {
            steps: {
              include: {
                questions: {
                  include: {
                    options: true
                  },
                  orderBy: { questionNumber: 'asc' }
                }
              },
              orderBy: { stepNumber: 'asc' }
            }
          }
        }
      }
    });

    res.json({ 
      message: 'Survey updated successfully',
      survey: updatedSurvey 
    });

  } catch (error: any) {
    console.error('Update survey error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred'
    });
  }
};

export const getSurveyResponses = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 설문이 존재하고 접근 권한이 있는지 확인 (템플릿 정보 포함)
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        seller: {
          select: { id: true }
        },
        template: {
          include: {
            steps: {
              include: {
                questions: {
                  include: {
                    options: {
                      orderBy: { optionNumber: 'asc' }
                    }
                  },
                  orderBy: { questionNumber: 'asc' }
                }
              },
              orderBy: { stepNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // 권한 확인 - 설문 작성자만 응답을 볼 수 있음
    if (req.user?.role === 'SELLER' && survey.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 설문 작성자나 관리자는 언제든 응답 조회 가능 (실시간 결과 가시성)
    if (req.user?.role !== 'ADMIN' && survey.sellerId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId: id },
      include: {
        consumer: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 응답 데이터를 처리하여 질문 정보와 매핑
    const processedResponses = responses.map(response => {
      const responseData = response.responses as any;
      const processedSteps = responseData.map((stepResponse: any) => {
        const templateStep = survey.template.steps.find(step => step.id === stepResponse.stepId);
        
        const processedAnswers = stepResponse.answers.map((answer: any) => {
          const question = templateStep?.questions.find(q => q.id === answer.questionId);
          let formattedValue = answer.value;
          let optionText = null;

          if (question) {
            // 답변 형식 변환
            switch (question.type) {
              case 'MULTIPLE_CHOICE':
                // ID로 저장된 경우와 optionNumber로 저장된 경우 모두 처리
                let option = question.options.find(opt => opt.id === answer.value);
                if (!option) {
                  // optionNumber로 저장된 경우
                  option = question.options.find(opt => opt.optionNumber === parseInt(answer.value));
                }
                if (!option && typeof answer.value === 'string') {
                  // 텍스트로 직접 저장된 경우
                  option = question.options.find(opt => opt.text === answer.value);
                }
                
                optionText = option ? option.text : answer.value;
                formattedValue = option ? `${option.optionNumber}. ${option.text}` : answer.value;
                break;
              case 'YES_NO':
                formattedValue = answer.value ? '예' : '아니오';
                break;
              case 'SCORE':
                formattedValue = `${answer.value}점`;
                break;
              case 'TEXT':
                formattedValue = answer.value;
                break;
            }
          }

          return {
            questionId: answer.questionId,
            questionText: question?.text || 'Unknown Question',
            questionType: question?.type || 'UNKNOWN',
            value: answer.value,
            formattedValue,
            optionText
          };
        });

        return {
          stepId: stepResponse.stepId,
          stepTitle: templateStep?.title || 'Unknown Step',
          answers: processedAnswers
        };
      });

      return {
        id: response.id,
        surveyId: response.surveyId,
        consumerId: response.consumerId,
        consumerName: response.consumer?.name || '익명',
        consumerAge: undefined, // 추후 구현
        consumerGender: undefined, // 추후 구현
        responses: processedSteps,
        createdAt: response.createdAt
      };
    });

    // 통계 데이터 생성
    const statistics = generateStatistics(survey, processedResponses);

    res.json({ 
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        maxParticipants: survey.maxParticipants,
        endDate: survey.endDate,
        template: survey.template
      },
      responses: processedResponses,
      statistics
    });

  } catch (error) {
    console.error('Get survey responses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 통계 데이터 생성 함수
function generateStatistics(survey: any, responses: any[]) {
  const statistics: any[] = [];
  
  survey.template.steps.forEach((step: any) => {
    step.questions.forEach((question: any) => {
      const questionResponses = responses.map(r => 
        r.responses.find((resp: any) => 
          resp.answers.find((ans: any) => ans.questionId === question.id)
        )?.answers.find((ans: any) => ans.questionId === question.id)
      ).filter(Boolean);

      const stat: any = {
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        statistics: {
          totalResponses: questionResponses.length
        }
      };

      switch (question.type) {
        case 'MULTIPLE_CHOICE':
          const optionCounts = question.options.reduce((acc: any, option: any) => {
            acc[option.optionNumber] = 0;
            return acc;
          }, {});

          questionResponses.forEach((response: any) => {
            // ID로 저장된 경우와 optionNumber로 저장된 경우 모두 처리
            let option = question.options.find(opt => opt.id === response.value);
            if (!option) {
              // optionNumber로 저장된 경우
              option = question.options.find(opt => opt.optionNumber === parseInt(response.value));
            }
            if (!option && typeof response.value === 'string') {
              // 텍스트로 직접 저장된 경우
              option = question.options.find(opt => opt.text === response.value);
            }
            
            if (option && optionCounts[option.optionNumber] !== undefined) {
              optionCounts[option.optionNumber]++;
            }
          });

          stat.statistics.options = question.options.map((option: any) => ({
            optionText: option.text,
            count: optionCounts[option.optionNumber] || 0,
            percentage: questionResponses.length > 0 
              ? ((optionCounts[option.optionNumber] || 0) / questionResponses.length * 100) 
              : 0
          }));
          break;

        case 'SCORE':
          const scores = questionResponses.map((r: any) => parseFloat(r.value)).filter(s => !isNaN(s));
          stat.statistics.averageScore = scores.length > 0 
            ? scores.reduce((a, b) => a + b, 0) / scores.length 
            : 0;
          break;

        case 'YES_NO':
          const yesCount = questionResponses.filter((r: any) => r.value === true || r.value === 'true').length;
          const noCount = questionResponses.filter((r: any) => r.value === false || r.value === 'false').length;
          stat.statistics.yesCount = yesCount;
          stat.statistics.noCount = noCount;
          break;

        case 'TEXT':
          stat.statistics.textResponses = questionResponses.map((r: any) => r.value).filter(v => v && v.trim());
          break;
      }

      statistics.push(stat);
    });
  });

  return statistics;
}

export const getTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.surveyTemplate.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            questions: {
              include: {
                options: {
                  orderBy: { optionNumber: 'asc' }
                }
              },
              orderBy: { questionNumber: 'asc' }
            }
          },
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 설문 마감연장
export const extendSurvey = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newEndDate, reason } = req.body;

    if (!req.user || req.user.role !== 'SELLER') {
      return res.status(403).json({ error: 'Only sellers can extend surveys' });
    }

    // 설문 존재 및 소유권 확인
    const survey = await prisma.survey.findUnique({
      where: { id }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    if (survey.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 연장 가능 조건 확인
    if (survey.status !== 'APPROVED') {
      return res.status(400).json({ error: '승인된 설문만 연장할 수 있습니다.' });
    }

    if (new Date() > survey.endDate) {
      return res.status(400).json({ error: '이미 마감된 설문은 연장할 수 없습니다.' });
    }

    if (survey.extensionCount >= 2) {
      return res.status(400).json({ error: '최대 2회까지만 연장할 수 있습니다.' });
    }

    // 새 마감일 유효성 확인
    const newDate = new Date(newEndDate);
    const currentDate = new Date();
    const maxExtensionDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 최대 30일

    if (newDate <= survey.endDate) {
      return res.status(400).json({ error: '연장일은 현재 마감일보다 늦어야 합니다.' });
    }

    if (newDate > maxExtensionDate) {
      return res.status(400).json({ error: '최대 30일까지만 연장할 수 있습니다.' });
    }

    // 연장 이력 생성
    const extensionHistory = Array.isArray(survey.extensionHistory) 
      ? survey.extensionHistory as any[]
      : [];
    
    extensionHistory.push({
      extensionNumber: survey.extensionCount + 1,
      previousEndDate: survey.endDate.toISOString(),
      newEndDate: newDate.toISOString(),
      reason: reason || '',
      extendedAt: new Date().toISOString()
    });

    // 설문 연장 처리
    const updatedSurvey = await prisma.survey.update({
      where: { id },
      data: {
        endDate: newDate,
        extensionCount: survey.extensionCount + 1,
        extensionHistory: extensionHistory,
        updatedAt: new Date()
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: '설문 마감일이 성공적으로 연장되었습니다.',
      survey: updatedSurvey,
      extensionInfo: {
        extensionNumber: updatedSurvey.extensionCount,
        previousEndDate: survey.endDate,
        newEndDate: newDate,
        reason: reason || ''
      }
    });

  } catch (error: any) {
    console.error('Extend survey error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred'
    });
  }
};

// 설문 중단 요청
export const requestSurveyCancellation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!req.user || req.user.role !== 'SELLER') {
      return res.status(403).json({ error: 'Only sellers can request survey cancellation' });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: '중단 사유는 최소 10자 이상 입력해주세요.' });
    }

    // 설문 존재 및 소유권 확인
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        responses: true,
        cancellationRequest: true
      }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    if (survey.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 중단 요청 가능 조건 확인
    if (survey.status !== 'APPROVED') {
      return res.status(400).json({ error: '진행 중인 설문만 중단 요청할 수 있습니다.' });
    }

    if (survey.cancellationRequest) {
      return res.status(400).json({ 
        error: '이미 중단 요청이 진행 중입니다.',
        existingRequest: {
          status: survey.cancellationRequest.status,
          requestedAt: survey.cancellationRequest.requestedAt
        }
      });
    }

    // 환불액 계산 (원래 로직이 맞음)
    // 미진행분에 대한 리워드 + 해당 수수료만 환불
    const completedResponses = survey.responses.length;
    const remainingSlots = survey.maxParticipants - completedResponses;
    const refundRewards = remainingSlots * survey.reward;
    const refundFee = refundRewards * 0.1; // 미진행분에 대한 10% 수수료
    const totalRefund = refundRewards + refundFee;

    // 중단 요청 생성
    const cancellationRequest = await prisma.surveyCancellationRequest.create({
      data: {
        surveyId: id,
        reason: reason.trim(),
        refundAmount: totalRefund
      }
    });

    // 설문 상태 업데이트
    await prisma.survey.update({
      where: { id },
      data: {
        cancellationStatus: 'PENDING',
        cancellationRequestedAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.status(201).json({
      message: '중단 요청이 성공적으로 제출되었습니다. 관리자 검토 후 처리됩니다.',
      cancellationRequest: {
        id: cancellationRequest.id,
        reason: cancellationRequest.reason,
        refundAmount: cancellationRequest.refundAmount,
        status: cancellationRequest.status,
        requestedAt: cancellationRequest.requestedAt
      },
      refundInfo: {
        completedResponses,
        remainingSlots,
        refundRewards,
        refundFee,
        totalRefund
      }
    });

  } catch (error: any) {
    console.error('Request survey cancellation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred'
    });
  }
};