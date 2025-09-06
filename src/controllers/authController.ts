import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';

export const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('role').isIn(['SELLER', 'CONSUMER', 'ADMIN']).withMessage('Role must be SELLER, CONSUMER, or ADMIN'),
  body('birthDate').isLength({ min: 6, max: 6 }).withMessage('Birth date must be YYMMDD format'),
  body('gender').isIn(['MALE', 'FEMALE']).withMessage('Gender must be MALE or FEMALE'),
  body('phoneNumber').isLength({ min: 11, max: 11 }).withMessage('Phone number must be 11 digits'),
  body('bankCode').notEmpty().withMessage('Bank code is required'),
  body('accountNumber').notEmpty().withMessage('Account number is required')
];

export const loginValidation = [
  body('email').isEmail().withMessage('올바른 이메일 형식을 입력해주세요.'),
  body('password').notEmpty().withMessage('비밀번호를 입력해주세요.')
];

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role, birthDate, gender, phoneNumber, bankCode, accountNumber } = req.body;

    // 전화번호 정규화 (하이픈 제거)
    const normalizedPhoneNumber = phoneNumber.replace(/\D/g, '');

    // 이메일 중복 검사
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUserByEmail) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 전화번호 중복 검사
    const existingUserByPhone = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhoneNumber }
    });

    if (existingUserByPhone) {
      return res.status(400).json({ error: '이미 사용 중인 전화번호입니다.' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        birthDate,
        gender,
        phoneNumber: normalizedPhoneNumber,
        bankCode,
        accountNumber
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        birthDate: true,
        gender: true,
        phoneNumber: true,
        bankCode: true,
        accountNumber: true,
        createdAt: true
      }
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      birthDate: user.birthDate,
      gender: user.gender
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Prisma unique constraint 오류 처리
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      if (field === 'email') {
        return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
      } else if (field === 'phoneNumber') {
        return res.status(400).json({ error: '이미 사용 중인 전화번호입니다.' });
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    console.log('🔐 Login attempt started');
    console.log(`📧 Email: ${req.body.email}`);
    console.log(`🌐 Origin: ${req.get('Origin') || 'no-origin'}`);
    console.log(`📍 User-Agent: ${req.get('User-Agent')?.substring(0, 50) || 'unknown'}...`);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      const firstError = errors.array()[0];
      return res.status(400).json({ 
        error: firstError.msg,
        code: 'VALIDATION_ERROR'
      });
    }

    const { email, password } = req.body;
    console.log('✅ Request validation passed');

    // Find user
    console.log('🔍 Looking up user in database...');
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ 
        error: '등록되지 않은 이메일입니다. 이메일을 확인해주세요.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    console.log('✅ User found in database');
    console.log(`👤 User ID: ${user.id}`);
    console.log(`👤 User Name: ${user.name}`);
    console.log(`👤 User Role: ${user.role}`);

    // Check password
    console.log('🔒 Checking password...');
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Password verification failed');
      console.log(`   Expected password length: ${password.length}`);
      console.log(`   Hash: ${user.password.substring(0, 20)}...`);
      return res.status(401).json({ 
        error: '비밀번호가 일치하지 않습니다. 다시 확인해주세요.',
        code: 'INVALID_PASSWORD'
      });
    }
    
    console.log('✅ Password verification successful');

    // Generate token
    console.log('🎫 Generating JWT token...');
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      birthDate: user.birthDate,
      gender: user.gender
    });
    
    console.log('✅ Token generated successfully');
    console.log(`🎫 Token: ${token.substring(0, 30)}...`);

    const response = {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        birthDate: user.birthDate,
        gender: user.gender,
        phoneNumber: user.phoneNumber,
        bankCode: user.bankCode,
        accountNumber: user.accountNumber
      },
      token
    };
    
    console.log('🎉 Login successful - sending response');
    res.json(response);

  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('🔍 Error stack:', error.stack);
    res.status(500).json({ 
      error: '로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      code: 'SERVER_ERROR'
    });
  }
};