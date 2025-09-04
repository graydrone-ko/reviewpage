import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import surveyRoutes from './routes/surveys';
import responseRoutes from './routes/responses';
import rewardRoutes from './routes/rewards';
import adminRoutes from './routes/admin';
import seoRoutes from './routes/seo';

// Process error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Trust proxy for Railway deployment (specific proxy configuration)
app.set('trust proxy', ['127.0.0.1', 'loopback', 'uniquelocal']);

// Health check - must be first, before any middleware
app.get('/health', (req, res) => {
  // Set proper headers for Railway health check
  res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  });
  
  console.log(`🔍 Health check requested from: ${req.ip || req.connection.remoteAddress}`);
  
  res.status(200).json({ 
    status: 'OK', 
    message: 'ReviewPage API is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  });
});

// Root endpoint for basic connectivity test
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'ReviewPage Backend API',
    version: '1.0.0'
  });
});

// Security middleware
app.use(helmet());

// CORS configuration for development and production
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'http://localhost:3001', // Local development backend
  process.env.FRONTEND_URL, // Production frontend URL
  'https://reviewpage.co.kr', // Production domain
  'https://www.reviewpage.co.kr', // Production domain with www
].filter(Boolean);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if the origin is allowed
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          return callback(new Error('Not allowed by CORS'));
        }
      }
    : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting with Railway-specific configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes (after health check defined above)

app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/admin', adminRoutes);

// SEO 라우트 (API prefix 없이)
app.use('/', seoRoutes);

// Backend API only - no static file serving needed

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler (개발 환경에서만)
if (process.env.NODE_ENV !== 'production') {
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Railway PORT env var: ${process.env.PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 External health check: http://0.0.0.0:${PORT}/health`);
  console.log(`✅ Server ready to accept connections`);
  
  // Test health endpoint immediately - Railway needs quick response
  setTimeout(() => {
    const http = require('http');
    const healthReq = http.request({
      hostname: '127.0.0.1', // Force IPv4 to avoid IPv6 connection issues
      port: PORT,
      path: '/health',
      method: 'GET',
      timeout: 5000,
      family: 4 // Explicitly use IPv4
    }, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
      res.on('end', () => {
        console.log(`✅ Internal health check successful: ${res.statusCode} - ${data}`);
        console.log(`🎯 Railway health check should be working on /health`);
      });
    });
    healthReq.on('error', (err: any) => {
      console.error(`❌ Internal health check failed:`, err);
    });
    healthReq.on('timeout', () => {
      console.error(`⏰ Health check timeout`);
      healthReq.destroy();
    });
    healthReq.end();
  }, 3000); // Test after 3 seconds - give server more time to fully start
  
  // Keep alive ping - reduce frequency to avoid noise and monitor resources
  setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log(`💗 Server heartbeat - ${new Date().toISOString()} - Uptime: ${Math.floor(process.uptime())}s`);
    console.log(`📊 Memory: ${Math.round(memUsage.heapUsed/1024/1024)}MB used, ${Math.round(memUsage.heapTotal/1024/1024)}MB total`);
    
    // Railway resource monitoring
    if (memUsage.heapUsed > 400 * 1024 * 1024) { // 400MB warning
      console.warn(`⚠️ High memory usage detected: ${Math.round(memUsage.heapUsed/1024/1024)}MB`);
      global.gc && global.gc(); // Force garbage collection if available
    }
  }, 90000); // Every 90 seconds - reduce frequency further
});

server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

// Enhanced shutdown handling for Railway debugging
process.on('SIGTERM', () => {
  const uptime = Math.floor(process.uptime());
  console.log(`📡 SIGTERM received after ${uptime}s uptime - Railway container termination`);
  console.log('🔍 This might indicate Railway resource limits, health check issues, or deployment policies');
  console.log('⏱️ Starting graceful shutdown...');
  
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
  
  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.log('⚠️ Force exit after 10s timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('📡 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Additional Railway debugging signals
process.on('SIGUSR1', () => {
  console.log('📡 SIGUSR1 received - Railway signal');
});

process.on('SIGUSR2', () => {
  console.log('📡 SIGUSR2 received - Railway signal');
});