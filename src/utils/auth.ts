import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

type User = {
  id: string;
  email: string;
  role: string;
  birthDate: string;
  gender: string;
  phoneNumber: string;
  bankCode: string;
  accountNumber: string;
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (user: Pick<User, 'id' | 'email' | 'role' | 'birthDate' | 'gender'>): string => {
  const secret = process.env.JWT_SECRET || 'temp-secret-for-railway-deployment-please-set-real-jwt-secret-in-env';
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      birthDate: user.birthDate,
      gender: user.gender
    },
    secret,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'temp-secret-for-railway-deployment-please-set-real-jwt-secret-in-env';
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.verify(token, secret);
};