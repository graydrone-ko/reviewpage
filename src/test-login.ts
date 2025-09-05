#!/usr/bin/env ts-node

import { PrismaClient } from './generated/prisma';
import { comparePassword } from './utils/auth';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function testLogin() {
  console.log('🔐 Testing Railway login functionality...');
  console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? 'Connected' : 'Missing'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚂 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || 'Not detected'}`);
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test credentials
    const testCredentials = [
      { email: 'graydrone@naver.com', password: '7300gray', role: 'ADMIN' },
      { email: 'seller@test.com', password: 'test123', role: 'SELLER' },
      { email: 'cunsumer@test.com', password: 'test123', role: 'CONSUMER' }
    ];
    
    console.log('\n🧪 Testing each login credential...');
    console.log('=============================================');
    
    for (const cred of testCredentials) {
      console.log(`\n👤 Testing ${cred.role}: ${cred.email}`);
      
      // 1. Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: cred.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
          birthDate: true,
          gender: true,
          phoneNumber: true,
          bankCode: true,
          accountNumber: true,
          createdAt: true
        }
      });
      
      if (!user) {
        console.log('❌ User not found in database');
        continue;
      }
      
      console.log('✅ User found in database');
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);
      
      // 2. Test password comparison
      try {
        const isValidPassword = await comparePassword(cred.password, user.password);
        if (isValidPassword) {
          console.log('✅ Password verification successful');
        } else {
          console.log('❌ Password verification failed');
          console.log(`   Expected: ${cred.password}`);
          console.log(`   Hash: ${user.password}`);
        }
      } catch (error: any) {
        console.log('❌ Password comparison error:', error.message);
      }
      
      // 3. Test field completeness
      const requiredFields = ['birthDate', 'gender', 'phoneNumber', 'bankCode', 'accountNumber'];
      let missingFields: string[] = [];
      
      requiredFields.forEach(field => {
        if (!user[field as keyof typeof user]) {
          missingFields.push(field);
        }
      });
      
      if (missingFields.length > 0) {
        console.log(`⚠️ Missing required fields: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ All required fields present');
      }
      
      console.log('---');
    }
    
    console.log('\n🌐 Testing API endpoint simulation...');
    
    // Test the actual login logic
    const testEmail = 'graydrone@naver.com';
    const testPassword = '7300gray';
    
    console.log(`📞 Simulating API call: POST /api/auth/login`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    
    const user = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    if (!user) {
      console.log('❌ API Simulation: User not found');
    } else {
      console.log('✅ API Simulation: User found');
      
      const isValidPassword = await comparePassword(testPassword, user.password);
      if (isValidPassword) {
        console.log('✅ API Simulation: Password valid');
        console.log('✅ API Simulation: Login should succeed');
        
        // Test JWT token generation
        try {
          const { generateToken } = require('./utils/auth');
          const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            birthDate: user.birthDate,
            gender: user.gender
          });
          console.log('✅ API Simulation: Token generated successfully');
          console.log(`   Token: ${token.substring(0, 30)}...`);
        } catch (error: any) {
          console.log('❌ API Simulation: Token generation failed:', error.message);
        }
        
      } else {
        console.log('❌ API Simulation: Password invalid');
        console.log('❌ API Simulation: Login should fail');
      }
    }
    
    console.log('\n🎉 Login test completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
    
    if (error.code === 'P1001') {
      console.error('🔌 Database connection failed. Check DATABASE_URL environment variable.');
    } else {
      console.error('🔍 Full error details:', error);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the test function
if (require.main === module) {
  testLogin();
}

export default testLogin;