import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env['PORT'] || '3000', 10),
    host: process.env['HOST'] || '0.0.0.0',
    nodeEnv: process.env['NODE_ENV'] || 'development',
  },

  // Database configuration
  database: {
    url: process.env['DATABASE_URL'] || 'postgresql://flight_user:flight_password@localhost:5432/flight_search_db',
  },

  // Redis configuration
  redis: {
    url: process.env['REDIS_URL'] || 'redis://localhost:6379',
  },

  // JWT configuration
  jwt: {
    secret: process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
  },

  // API configuration
  api: {
    prefix: '/api',
    version: 'v1',
  },

  // CORS configuration
  cors: {
    origin: process.env['CORS_ORIGIN'] || '*',
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Logging
  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
  },

  // LLM configuration (Requesty API)
  llm: {
    baseUrl: process.env['REQUESTY_BASE_URL'] || 'https://router.requesty.ai/v1',
    apiKey: process.env['REQUESTY_API_KEY'] || 'your-requesty-api-key',
    model: process.env['LLM_MODEL'] || 'openai/gpt-4o',
    fallbackModel: process.env['LLM_FALLBACK_MODEL'] || 'openai/gpt-3.5-turbo',
    referer: process.env['LLM_REFERER'] || 'https://flight-search-saas.com',
    title: process.env['LLM_TITLE'] || 'Flight Search SaaS',
    enableFallback: process.env['ENABLE_LLM_FALLBACK'] !== 'false',
  },
};