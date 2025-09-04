# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReviewPage Platform is a Node.js/TypeScript backend API for a survey/review platform with seller-consumer workflow. The system allows sellers to create surveys for product reviews, consumers to participate and earn rewards, and admins to manage the entire process.

## Common Commands

### Development
- `npm run dev` - Start development server with hot reload (nodemon)
- `npm run build` - Compile TypeScript and generate Prisma client  
- `npm start` - Start production server (runs compiled JS from dist/)

### Database Operations
- `npm run db:generate` - Generate Prisma client only
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Deploy migrations to production database
- `npm run db:studio` - Open Prisma Studio database GUI
- `npm run db:seed` - Seed database with test users

### Docker Deployment
- `docker build -t reviewpage-backend .` - Build Docker image
- Container exposes port via `$PORT` environment variable

## Architecture Overview

### Core Technologies
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL with Prisma ORM  
- **Authentication**: JWT tokens with bcryptjs password hashing
- **Deployment**: Docker containerization for Railway/cloud deployment

### Database Schema Structure
The system uses a complex relational model centered around:

- **Users** (sellers/consumers/admins) with role-based access
- **SurveyTemplates** with reusable step/question structures
- **Surveys** created by sellers using templates, requiring admin approval
- **SurveyResponses** from consumers, with reward calculations
- **Rewards** system with pending/paid status tracking
- **Cancellation/Withdrawal** request workflows with admin approval

### Key Business Logic

**Survey Lifecycle**: PENDING → APPROVED → COMPLETED/CANCELLED
- Sellers create surveys requiring admin approval
- Approved surveys accept consumer responses until maxParticipants reached
- Automatic reward calculation: consumer rewards + 10% platform fee
- Survey extension system (max 2 times, 30 days each)
- Cancellation requests with partial refund calculations

**Financial System**: 
- Reward calculations based on completed responses
- Platform fee: 10% of total survey budget
- Refund logic: returns unspent budget minus earned rewards
- Withdrawal request system for consumer earnings

### API Architecture

**Route Structure**:
- `/api/auth/*` - Authentication (login/register)
- `/api/surveys/*` - Survey CRUD operations  
- `/api/responses/*` - Survey response submission
- `/api/rewards/*` - Reward management
- `/api/admin/*` - Admin panel operations
- `/*` - SEO routes (sitemap.xml, robots.txt)

**Middleware Stack**:
- helmet - Security headers
- cors - Cross-origin configuration  
- rateLimit - API rate limiting (100 req/15min)
- express-validator - Request validation
- Custom auth/adminAuth middleware for role-based access

### File Organization

**Controllers** (`src/controllers/`): Business logic handlers
- `surveyController.ts` - Survey CRUD, statistics, extensions, cancellations
- `authController.ts` - User authentication and registration
- `adminController.ts` - Admin dashboard, approval workflows
- `responseController.ts` - Survey response submission and retrieval
- `rewardController.ts` - Consumer reward management
- `financeController.ts` - Financial calculations and reports

**Database** (`src/utils/database.ts`): Single Prisma client instance with development connection pooling

**Generated Code** (`src/generated/prisma/`): Auto-generated Prisma client (do not edit manually)

### Scripts Directory

The `/scripts` folder contains operational utilities:
- `backup-and-clean-data.js` - Data backup with confirmation prompts
- `create-default-template.ts` - Initialize survey template system
- `generate-jwt-secret.js` - Generate secure JWT secrets
- Database repair scripts: `fix-*.js` files for data corrections
- Test utilities: `create-test-*.js` for development data

### Development Patterns

**Database Access**: Always use the centralized `prisma` instance from `src/utils/database.ts`

**Error Handling**: Controllers use try/catch with specific Prisma error code handling (P2003, P2002)

**Validation**: express-validator middleware on controller routes with consistent error response format

**Authentication**: JWT tokens with role-based access control (SELLER/CONSUMER/ADMIN)

**Environment Configuration**: 
- Development: `.env` file required
- Production: Environment variables for DATABASE_URL, JWT_SECRET, FRONTEND_URL

### Deployment Considerations

**Docker**: Multi-stage build with npm ci for production dependencies, Prisma generation, and TypeScript compilation

**Database**: PostgreSQL with migration-based schema management via Prisma

**Static File Serving**: Production mode serves frontend static files with SPA routing fallback

**CORS**: Dynamic origin allowlist supporting localhost development and production domains

## Testing and Maintenance

Use scripts in `/scripts` directory for database operations and testing. Always backup data before running data manipulation scripts.

For Railway deployment, the application expects DATABASE_URL and other environment variables to be set in the platform configuration.