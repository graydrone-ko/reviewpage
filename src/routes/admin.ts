import express from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { 
  getDashboardStats, 
  getUsers, 
  updateSurveyStatus, 
  getAllSurveys,
  getPendingSurveys,
  getRewards,
  updateRewardStatus,
  getSurveyResponses,
  getCancellationRequests,
  getCancellationRequestStats,
  processCancellationRequest,
  getRecentCancellationRequests,
  getWithdrawalRequests,
  processWithdrawalRequest,
  getRecentWithdrawalRequests
} from '../controllers/adminController';
import financeRoutes from './finance';

const router = express.Router();

// 모든 admin 라우트에 adminAuth 미들웨어 적용
router.use(adminAuth as any);

// 대시보드 통계
router.get('/dashboard/stats', getDashboardStats as any);

// 사용자 관리
router.get('/users', getUsers as any);

// 설문 관리
router.get('/surveys', getAllSurveys as any); // 향상된 기능: 모든 설문 조회
router.get('/surveys/pending', getPendingSurveys as any); // 기존 기능 유지
router.patch('/surveys/:surveyId/status', updateSurveyStatus as any);
router.get('/surveys/:surveyId/responses', getSurveyResponses as any);

// 리워드 관리
router.get('/rewards', getRewards as any);
router.patch('/rewards/:rewardId/status', updateRewardStatus as any);

// 중단요청 관리
router.get('/cancellation-requests', getCancellationRequests as any);
router.get('/cancellation-requests/stats', getCancellationRequestStats as any);
router.get('/cancellation-requests/recent', getRecentCancellationRequests as any);
router.patch('/cancellation-requests/:surveyId/process', processCancellationRequest as any);

// 출금요청 관리
router.get('/withdrawal-requests', getWithdrawalRequests as any);
router.get('/withdrawal-requests/recent', getRecentWithdrawalRequests as any);
router.patch('/withdrawal-requests/:id/process', processWithdrawalRequest as any);

// 재무 관리
router.use('/finance', financeRoutes);

export default router;