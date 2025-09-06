// Temporary CORS fix for debugging
// Replace the CORS configuration in index.ts with this more permissive version

const corsConfig = {
  origin: true, // Allow all origins during debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

console.log('🔧 Using permissive CORS config for debugging');
console.log('⚠️ WARNING: This should only be used for debugging, not production!');