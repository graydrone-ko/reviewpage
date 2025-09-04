import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { AdminRequest } from '../types/express';

export const adminAuth = (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);
    
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
      createdAt: decoded.createdAt,
      updatedAt: decoded.updatedAt,
      birthDate: decoded.birthDate,
      gender: decoded.gender,
      phoneNumber: decoded.phoneNumber,
      bankCode: decoded.bankCode,
      accountNumber: decoded.accountNumber
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};