#!/usr/bin/env ts-node

import { PrismaClient } from './generated/prisma';
import { hashPassword } from './utils/auth';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function seedRailwayUsers() {
  console.log('🌱 Starting Railway database seeding...');
  console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? 'Connected' : 'Missing'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚂 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || 'Not detected'}`);
  
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if users table exists and get current count
    const userCount = await prisma.user.count();
    console.log(`📊 Current users in database: ${userCount}`);
    
    if (userCount > 0) {
      console.log('📋 Existing users found. Updating passwords...');
    } else {
      console.log('📋 No users found. Creating new users...');
    }
    
    // Create admin user
    console.log('👤 Processing admin user...');
    const adminHashedPassword = await hashPassword('7300gray');
    const admin = await prisma.user.upsert({
      where: { email: 'graydrone@naver.com' },
      update: {
        password: adminHashedPassword,
        name: '관리자',
        role: 'ADMIN'
      },
      create: {
        email: 'graydrone@naver.com',
        password: adminHashedPassword,
        name: '관리자',
        role: 'ADMIN',
        birthDate: '800101',
        gender: 'MALE',
        phoneNumber: '01000000001',
        bankCode: 'KB',
        accountNumber: '000000000001'
      }
    });
    console.log(`✅ Admin created/updated: ${admin.email} (ID: ${admin.id})`);
    
    // Create seller user
    console.log('👤 Processing seller user...');
    const sellerHashedPassword = await hashPassword('test123');
    const seller = await prisma.user.upsert({
      where: { email: 'seller@test.com' },
      update: {
        password: sellerHashedPassword,
        name: '김판매자',
        role: 'SELLER'
      },
      create: {
        email: 'seller@test.com',
        password: sellerHashedPassword,
        name: '김판매자',
        role: 'SELLER',
        birthDate: '880523',
        gender: 'MALE',
        phoneNumber: '01098765432',
        bankCode: 'NH',
        accountNumber: '352-1234-5678-90'
      }
    });
    console.log(`✅ Seller created/updated: ${seller.email} (ID: ${seller.id})`);
    
    // Create consumer user
    console.log('👤 Processing consumer user...');
    const consumerHashedPassword = await hashPassword('test123');
    const consumer = await prisma.user.upsert({
      where: { email: 'cunsumer@test.com' },
      update: {
        password: consumerHashedPassword,
        name: '이설문자',
        role: 'CONSUMER'
      },
      create: {
        email: 'cunsumer@test.com',
        password: consumerHashedPassword,
        name: '이설문자',
        role: 'CONSUMER',
        birthDate: '920815',
        gender: 'FEMALE',
        phoneNumber: '01055556666',
        bankCode: 'KB',
        accountNumber: '123-456-789012'
      }
    });
    console.log(`✅ Consumer created/updated: ${consumer.email} (ID: ${consumer.id})`);
    
    // Verify creation
    const finalCount = await prisma.user.count();
    console.log(`📊 Final user count: ${finalCount}`);
    
    // List all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n📋 All users in database:');
    console.log('==========================================');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('---');
    });
    
    console.log('\n🎉 Railway database seeding completed successfully!');
    console.log('\n🔐 Login Credentials:');
    console.log(`   Admin: graydrone@naver.com / 7300gray`);
    console.log(`   Seller: seller@test.com / test123`);
    console.log(`   Consumer: cunsumer@test.com / test123`);
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    
    if (error.code === 'P1001') {
      console.error('🔌 Database connection failed. Check DATABASE_URL environment variable.');
    } else if (error.code === 'P2002') {
      console.error('📧 Unique constraint violation. User might already exist with different data.');
    } else {
      console.error('🔍 Full error details:', error);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding function
if (require.main === module) {
  seedRailwayUsers();
}

export default seedRailwayUsers;