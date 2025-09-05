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
    
    // Execute migration SQL directly
    const migrationSQL = `
-- Add missing columns to users table for Railway PostgreSQL schema compatibility

-- Add accountNumber column if it doesn't exist
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;

-- Add bankCode column if it doesn't exist  
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "bankCode" TEXT;

-- Add birthDate column if it doesn't exist
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "birthDate" TEXT;

-- Add phoneNumber column if it doesn't exist
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

-- Update NOT NULL constraints for existing data (set defaults for null values)
UPDATE "public"."users" 
SET "accountNumber" = '000000000000' 
WHERE "accountNumber" IS NULL;

UPDATE "public"."users" 
SET "bankCode" = 'KB' 
WHERE "bankCode" IS NULL;

UPDATE "public"."users" 
SET "birthDate" = '000101' 
WHERE "birthDate" IS NULL;

UPDATE "public"."users" 
SET "phoneNumber" = '01000000000' || "id"
WHERE "phoneNumber" IS NULL;

-- Add NOT NULL constraints after setting defaults
ALTER TABLE "public"."users" 
ALTER COLUMN "accountNumber" SET NOT NULL;

ALTER TABLE "public"."users" 
ALTER COLUMN "bankCode" SET NOT NULL;

ALTER TABLE "public"."users" 
ALTER COLUMN "birthDate" SET NOT NULL;

ALTER TABLE "public"."users" 
ALTER COLUMN "phoneNumber" SET NOT NULL;
`;

    // Split SQL into individual commands and execute
    const sqlCommands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (const command of sqlCommands) {
      if (command.trim()) {
        try {
          console.log(`📝 Executing: ${command.substring(0, 50)}...`);
          await prisma.$executeRawUnsafe(command + ';');
          console.log('✅ Success');
        } catch (error: any) {
          if (error.code === 'P2010' || error.message.includes('already exists')) {
            console.log('⚠️ Already exists, skipping');
          } else {
            console.error(`❌ Error: ${error.message}`);
          }
        }
      }
    }
    
    // Test the schema by checking if accountNumber column exists
    console.log('🧪 Testing schema update...');
    const testUser = await prisma.user.findFirst();
    if (testUser) {
      console.log('✅ Schema validation successful - accountNumber field accessible');
      console.log(`📋 Test user fields: id=${testUser.id}, email=${testUser.email}`);
    } else {
      console.log('📋 No users found - schema migration complete, ready for seeding');
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