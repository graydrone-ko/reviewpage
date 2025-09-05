#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import { PrismaClient } from './generated/prisma';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function railwayDiagnostics() {
  console.log('🔧 Railway Environment Diagnostics');
  console.log('=====================================');
  
  // 1. Environment Variables Check
  console.log('\n📋 Environment Variables:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`   PORT: ${process.env.PORT || 'undefined'}`);
  console.log(`   RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT || 'undefined'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set ✅' : 'Missing ❌'}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? 'Set ✅' : 'Missing ❌'}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'undefined'}`);
  
  // 2. Database Connection Test
  console.log('\n🔗 Database Connection Test:');
  try {
    await prisma.$connect();
    console.log('   Connection: ✅ Success');
    
    // Test database queries
    const userCount = await prisma.user.count();
    console.log(`   User count: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true
        },
        take: 3
      });
      
      console.log('   Sample users:');
      users.forEach(user => {
        console.log(`     - ${user.email} (${user.role})`);
        console.log(`       Password hash: ${user.password.substring(0, 20)}...`);
      });
    }
    
  } catch (error: any) {
    console.log('   Connection: ❌ Failed');
    console.log(`   Error: ${error.message}`);
  }
  
  // 3. JWT Secret Test
  console.log('\n🔐 JWT Configuration Test:');
  try {
    const { generateToken, verifyToken } = require('./utils/auth');
    
    if (!process.env.JWT_SECRET) {
      console.log('   JWT_SECRET: ❌ Missing');
    } else {
      console.log('   JWT_SECRET: ✅ Present');
      
      // Test token generation
      const testToken = generateToken({
        id: 'test-id',
        email: 'test@test.com',
        role: 'CONSUMER',
        birthDate: '990101',
        gender: 'MALE'
      });
      
      console.log('   Token generation: ✅ Success');
      console.log(`   Sample token: ${testToken.substring(0, 30)}...`);
      
      // Test token verification
      try {
        const decoded = verifyToken(testToken);
        console.log('   Token verification: ✅ Success');
      } catch (error) {
        console.log('   Token verification: ❌ Failed');
      }
    }
  } catch (error: any) {
    console.log('   JWT Test: ❌ Failed');
    console.log(`   Error: ${error.message}`);
  }
  
  // 4. Password Hashing Test
  console.log('\n🔒 Password Hashing Test:');
  try {
    const { hashPassword, comparePassword } = require('./utils/auth');
    
    const testPassword = '7300gray';
    const hashedPassword = await hashPassword(testPassword);
    console.log('   Hashing: ✅ Success');
    console.log(`   Hash: ${hashedPassword.substring(0, 30)}...`);
    
    const isValid = await comparePassword(testPassword, hashedPassword);
    console.log(`   Comparison: ${isValid ? '✅' : '❌'} ${isValid ? 'Success' : 'Failed'}`);
    
  } catch (error: any) {
    console.log('   Password Test: ❌ Failed');
    console.log(`   Error: ${error.message}`);
  }
  
  // 5. HTTP Response Test  
  console.log('\n🌐 HTTP Response Simulation:');
  try {
    // Simulate typical request/response cycle
    const mockReq = {
      body: {
        email: 'graydrone@naver.com',
        password: '7300gray'
      }
    };
    
    console.log(`   Request simulation: ${mockReq.body.email}/${mockReq.body.password}`);
    
    // Find user (same as authController)
    const user = await prisma.user.findUnique({
      where: { email: mockReq.body.email }
    });
    
    if (!user) {
      console.log('   User lookup: ❌ User not found');
    } else {
      console.log('   User lookup: ✅ User found');
      
      const { comparePassword, generateToken } = require('./utils/auth');
      const isValidPassword = await comparePassword(mockReq.body.password, user.password);
      
      if (!isValidPassword) {
        console.log('   Password check: ❌ Invalid password');
      } else {
        console.log('   Password check: ✅ Valid password');
        
        const token = generateToken({
          id: user.id,
          email: user.email,
          role: user.role,
          birthDate: user.birthDate,
          gender: user.gender
        });
        
        console.log('   Token generation: ✅ Success');
        console.log('   Final result: ✅ Login should succeed');
        
        const mockResponse = {
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          token
        };
        
        console.log('   Response payload: ✅ Generated');
      }
    }
    
  } catch (error: any) {
    console.log('   HTTP Simulation: ❌ Failed');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n🎯 Diagnostic Summary:');
  console.log('=====================================');
  console.log('If all tests show ✅, the login should work.');
  console.log('If you see ❌, those are the areas to investigate.');
  console.log('\nPossible Railway-specific issues:');
  console.log('- CORS configuration blocking frontend requests');
  console.log('- Railway domain/URL configuration mismatch');
  console.log('- Environment variable propagation delays');
  console.log('- Railway health check interfering with requests');
  
  await prisma.$disconnect();
}

// Run diagnostics
if (require.main === module) {
  railwayDiagnostics().catch(console.error);
}

export default railwayDiagnostics;