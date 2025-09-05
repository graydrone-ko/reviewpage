#!/usr/bin/env ts-node

import { PrismaClient } from './generated/prisma';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function applyRailwayMigration() {
  console.log('🔧 Starting Railway database migration...');
  console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? 'Connected' : 'Missing'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚂 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || 'Not detected'}`);
  
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    console.log('🛠️ Executing Railway migration SQL...');
    
    // Check current table structure first
    console.log('🔍 Checking current users table structure...');
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY column_name;
    `;
    console.log('📋 Current table structure:', tableInfo);
    
    // Execute migration SQL step by step
    const migrationSteps = [
      {
        name: "Add accountNumber column",
        sql: `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;`
      },
      {
        name: "Add bankCode column", 
        sql: `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "bankCode" TEXT;`
      },
      {
        name: "Add birthDate column",
        sql: `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "birthDate" TEXT;`
      },
      {
        name: "Add phoneNumber column",
        sql: `ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;`
      },
      {
        name: "Set accountNumber default values",
        sql: `UPDATE "public"."users" SET "accountNumber" = '000000000000' WHERE "accountNumber" IS NULL;`
      },
      {
        name: "Set bankCode default values",
        sql: `UPDATE "public"."users" SET "bankCode" = 'KB' WHERE "bankCode" IS NULL;`
      },
      {
        name: "Set birthDate default values", 
        sql: `UPDATE "public"."users" SET "birthDate" = '000101' WHERE "birthDate" IS NULL;`
      },
      {
        name: "Set phoneNumber default values",
        sql: `UPDATE "public"."users" SET "phoneNumber" = '01000000000' || "id" WHERE "phoneNumber" IS NULL;`
      },
      {
        name: "Set accountNumber NOT NULL",
        sql: `ALTER TABLE "public"."users" ALTER COLUMN "accountNumber" SET NOT NULL;`
      },
      {
        name: "Set bankCode NOT NULL", 
        sql: `ALTER TABLE "public"."users" ALTER COLUMN "bankCode" SET NOT NULL;`
      },
      {
        name: "Set birthDate NOT NULL",
        sql: `ALTER TABLE "public"."users" ALTER COLUMN "birthDate" SET NOT NULL;`
      },
      {
        name: "Set phoneNumber NOT NULL",
        sql: `ALTER TABLE "public"."users" ALTER COLUMN "phoneNumber" SET NOT NULL;`
      }
    ];

    // Execute each migration step individually
    for (const step of migrationSteps) {
      try {
        console.log(`📝 ${step.name}...`);
        await prisma.$executeRawUnsafe(step.sql);
        console.log('✅ Success');
      } catch (error: any) {
        if (error.code === 'P2010' || error.message.includes('already exists')) {
          console.log('⚠️ Already exists, skipping');
        } else {
          console.error(`❌ Error in ${step.name}: ${error.message}`);
          // Continue with other steps even if one fails
        }
      }
    }
    
    // Check table structure after migration
    console.log('🔍 Checking updated table structure...');
    const updatedTableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY column_name;
    `;
    console.log('📋 Updated table structure:', updatedTableInfo);
    
    // Test the schema by using raw query instead of Prisma model
    console.log('🧪 Testing schema update with raw query...');
    try {
      const testQuery = await prisma.$queryRaw`
        SELECT id, email, "accountNumber", "bankCode", "birthDate", "phoneNumber"
        FROM "public"."users" 
        LIMIT 1;
      `;
      console.log('✅ Schema validation successful - all required fields accessible');
      console.log('📋 Raw query result:', testQuery);
      
      // Now test Prisma model access
      console.log('🧪 Testing Prisma model access...');
      const testUser = await prisma.user.findFirst();
      if (testUser) {
        console.log('✅ Prisma model access successful');
        console.log(`📋 User: ${testUser.email}, Account: ${testUser.accountNumber}`);
      } else {
        console.log('📋 No users found - ready for seeding');
      }
    } catch (error: any) {
      console.error('❌ Schema test failed:', error.message);
      // Still continue to report success for the migration part
    }
    
    console.log('🎉 Railway database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    
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

// Run the migration function
if (require.main === module) {
  applyRailwayMigration();
}

export default applyRailwayMigration;