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

-- Remove age column if it exists (not in current schema)
ALTER TABLE "public"."users" 
DROP COLUMN IF EXISTS "age";

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
SET "phoneNumber" = '01000000000' 
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

-- Add unique constraint for phoneNumber if it doesn't exist
ALTER TABLE "public"."users" 
ADD CONSTRAINT IF NOT EXISTS "users_phoneNumber_key" UNIQUE ("phoneNumber");

-- Update Gender enum to include ALL value
ALTER TYPE "public"."Gender" ADD VALUE IF NOT EXISTS 'ALL';

-- Update SurveyStatus enum to include SUSPENDED value
ALTER TYPE "public"."SurveyStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- Update RewardType enum to include REFUND value  
ALTER TYPE "public"."RewardType" ADD VALUE IF NOT EXISTS 'REFUND';

-- Add missing columns to surveys table if they don't exist
ALTER TABLE "public"."surveys" 
ADD COLUMN IF NOT EXISTS "storeName" TEXT DEFAULT '';

ALTER TABLE "public"."surveys"
ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

ALTER TABLE "public"."surveys"
ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

ALTER TABLE "public"."surveys"
ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);

ALTER TABLE "public"."surveys"
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

ALTER TABLE "public"."surveys"
ADD COLUMN IF NOT EXISTS "extensionCount" INTEGER DEFAULT 0;

ALTER TABLE "public"."surveys"
ADD COLUMN IF NOT EXISTS "extensionHistory" JSONB;

ALTER TABLE "public"."surveys"
ADD COLUMN IF NOT EXISTS "cancellationStatus" "public"."CancellationStatus";

ALTER TABLE "public"."surveys"
ADD COLUMN IF NOT EXISTS "cancellationRequestedAt" TIMESTAMP(3);

-- Add missing columns to survey_questions table
ALTER TABLE "public"."survey_questions"
ADD COLUMN IF NOT EXISTS "minLength" INTEGER;

ALTER TABLE "public"."survey_questions"
ADD COLUMN IF NOT EXISTS "maxLength" INTEGER;

ALTER TABLE "public"."survey_questions"
ADD COLUMN IF NOT EXISTS "placeholder" TEXT;

-- Update survey_responses table with default updatedAt
ALTER TABLE "public"."survey_responses"
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Create survey_cancellation_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."survey_cancellation_requests" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "refundAmount" DOUBLE PRECISION NOT NULL,
    "status" "public"."CancellationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,

    CONSTRAINT "survey_cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- Create withdrawal_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."withdrawal_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "note" TEXT,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- Add indexes and constraints if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "survey_cancellation_requests_surveyId_key" 
ON "public"."survey_cancellation_requests"("surveyId");

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'survey_cancellation_requests_surveyId_fkey'
    ) THEN
        ALTER TABLE "public"."survey_cancellation_requests" 
        ADD CONSTRAINT "survey_cancellation_requests_surveyId_fkey" 
        FOREIGN KEY ("surveyId") REFERENCES "public"."surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'withdrawal_requests_userId_fkey'
    ) THEN
        ALTER TABLE "public"."withdrawal_requests" 
        ADD CONSTRAINT "withdrawal_requests_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;