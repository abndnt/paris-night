# 🔧 Environment Files Setup Guide

## 📋 Overview of Environment Files

You have **4 environment files** for different purposes:

| File | Purpose | When to Use |
|------|---------|-------------|
| `.env.example` | **Template** for local development | Copy to create your `.env` |
| `.env.test` | **Testing** environment | Automated tests (Jest, Playwright) |
| `.env.staging.example` | **Staging** deployment template | Pre-production testing |
| `.env` | **Your actual** local development | Daily development work |

## 🎯 For Initial App Testing (Your Current Phase)

### **Step 1: Create Your Local Development Environment**

```bash
# Copy the template to create your actual .env file
cp .env.example .env
```

### **Step 2: Update Your `.env` File**

Here's what you need to change in your `.env` file for testing:

```bash
# ===== REQUIRED CHANGES =====

# 1. Generate a secure JWT secret (required for auth)
JWT_SECRET=your-super-secure-random-string-here-make-it-long-and-complex

# 2. Add your API keys (get these from the services)
REQUESTY_API_KEY=your-actual-requesty-api-key-here
STRIPE_SECRET_KEY=sk_test_your-actual-stripe-test-key-here

# ===== OPTIONAL FOR TESTING =====

# 3. Amadeus API (for real flight data - optional for now)
AMADEUS_CLIENT_ID=your-amadeus-client-id
AMADEUS_CLIENT_SECRET=your-amadeus-client-secret

# ===== KEEP AS-IS FOR LOCAL TESTING =====
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://flight_user:flight_password@localhost:5432/flight_search_db
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

## 🔑 API Keys You Need for Testing

### **1. JWT Secret (Required)**
```bash
# Generate a secure random string
JWT_SECRET=flight-search-jwt-super-secret-key-2024-development-only-change-for-production
```

### **2. Requesty API (Required for AI features)**
- **Sign up**: https://requesty.ai
- **Free tier**: Available
- **Used for**: Chat interface, AI-powered search
- **Add to .env**: `REQUESTY_API_KEY=your-actual-key-here`

### **3. Stripe (Required for payment testing)**
- **Sign up**: https://dashboard.stripe.com
- **Use**: Test keys (start with `sk_test_`)
- **Used for**: Payment processing, booking
- **Add to .env**: `STRIPE_SECRET_KEY=sk_test_your-key-here`

### **4. Amadeus (Optional - for real flight data)**
- **Sign up**: https://developers.amadeus.com
- **Free tier**: 2,000 API calls/month
- **Used for**: Real flight search data
- **Add to .env**: 
  ```bash
  AMADEUS_CLIENT_ID=your-client-id
  AMADEUS_CLIENT_SECRET=your-client-secret
  ```

## 📁 File-by-File Breakdown

### **`.env` (Your Working File)**
```bash
# This is YOUR file for daily development
# Copy from .env.example and add real API keys
# Never commit this file to Git (.gitignore protects it)

NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://flight_user:flight_password@localhost:5432/flight_search_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-actual-secure-jwt-secret-here
REQUESTY_API_KEY=your-actual-requesty-key-here
STRIPE_SECRET_KEY=sk_test_your-actual-stripe-key-here
# ... other settings
```

### **`.env.test` (Automated Testing)**
```bash
# Used automatically when running tests
# npm test, npm run test:e2e, etc.
# Uses test database and mock/test API keys
# You don't need to modify this file

NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/flight_search_test
JWT_SECRET=test-secret-key-for-testing-only
REQUESTY_API_KEY=test-api-key  # Mock key for tests
STRIPE_SECRET_KEY=sk_test_test_key  # Mock key for tests
```

### **`.env.example` (Template)**
```bash
# Template file with placeholder values
# Used to create new .env files
# Safe to commit to Git (no real secrets)
# Don't modify this - it's the template for others
```

### **`.env.staging.example` (Future Use)**
```bash
# Template for staging deployment
# You'll use this later when deploying to staging
# For now, ignore this file
```

## 🚀 Quick Setup for Testing

### **Option A: Minimal Setup (Just to get running)**
```bash
# 1. Copy template
cp .env.example .env

# 2. Edit .env and change only these lines:
JWT_SECRET=flight-search-development-secret-key-2024
REQUESTY_API_KEY=test-key-for-now  # Use mock for now
STRIPE_SECRET_KEY=sk_test_mock_key  # Use mock for now

# 3. Start the app
npm run dev
```

### **Option B: Full Setup (With real APIs)**
```bash
# 1. Copy template
cp .env.example .env

# 2. Get real API keys:
# - Requesty: https://requesty.ai
# - Stripe: https://dashboard.stripe.com

# 3. Update .env with real keys
# 4. Start the app
npm run dev
```

## 🧪 Testing Your Setup

### **1. Test Environment Loading**
```bash
# Check if environment is loaded correctly
npm run test:apis
```

### **2. Test Database Connection**
```bash
# Should connect to PostgreSQL
curl http://localhost:3000/api/health
```

### **3. Test API Keys**
```bash
# Test flight search (uses Requesty API if configured)
curl -X POST http://localhost:3000/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{"origin":"LAX","destination":"JFK","departureDate":"2024-06-15","passengers":1}'
```

## 🔒 Security Best Practices

### **DO:**
- ✅ Keep `.env` file local only (never commit)
- ✅ Use test API keys for development
- ✅ Generate strong JWT secrets
- ✅ Use different secrets for each environment

### **DON'T:**
- ❌ Commit `.env` file to Git
- ❌ Use production API keys for testing
- ❌ Share your `.env` file
- ❌ Use weak JWT secrets

## 🐛 Troubleshooting

### **"Cannot connect to database"**
```bash
# Make sure Docker services are running
docker-compose up -d postgres redis

# Check if services are healthy
docker-compose ps
```

### **"Invalid JWT secret"**
```bash
# Make sure JWT_SECRET is set and not empty
echo $JWT_SECRET  # Should show your secret
```

### **"API key invalid"**
```bash
# Check your API keys are correct
# For testing, you can use mock keys temporarily
```

### **"Port 3000 already in use"**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

## 📝 Environment File Template for Testing

Here's a ready-to-use `.env` file for initial testing:

```bash
# Copy this to your .env file and update the API keys

# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration (Docker defaults)
DATABASE_URL=postgresql://flight_user:flight_password@localhost:5432/flight_search_db

# Redis Configuration (Docker defaults)
REDIS_URL=redis://localhost:6379

# JWT Configuration (CHANGE THIS!)
JWT_SECRET=flight-search-development-jwt-secret-2024-change-for-production
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=*

# Logging Configuration
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# LLM Configuration (GET REAL KEY FROM https://requesty.ai)
REQUESTY_API_KEY=your-requesty-api-key-here
REQUESTY_BASE_URL=https://router.requesty.ai/v1
LLM_MODEL=openai/gpt-4o
LLM_FALLBACK_MODEL=openai/gpt-3.5-turbo
LLM_REFERER=https://flight-search-saas.com
LLM_TITLE=Flight Search SaaS
ENABLE_LLM_FALLBACK=true

# Payment Configuration (GET TEST KEY FROM https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_your-stripe-test-key-here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
STRIPE_API_VERSION=2023-10-16

# Payment Settings
DEFAULT_CURRENCY=USD
SUPPORTED_CURRENCIES=USD,EUR,GBP,CAD,AUD
MAX_REFUND_DAYS=30
ENABLE_POINTS_PAYMENTS=true
ENABLE_MIXED_PAYMENTS=true

# Receipt Settings
ENABLE_EMAIL_RECEIPTS=true
DEFAULT_RECEIPT_LANGUAGE=en
SUPPORTED_RECEIPT_LANGUAGES=en,es,fr,de
ENABLE_PDF_RECEIPTS=true

# Webhook Settings
ENABLE_PAYMENT_WEBHOOKS=true
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY_MS=1000

# Optional: Amadeus API (for real flight data)
# AMADEUS_CLIENT_ID=your-amadeus-client-id
# AMADEUS_CLIENT_SECRET=your-amadeus-client-secret
```

## 🎯 Next Steps

1. **Create your `.env`**: Copy template and add real API keys
2. **Test locally**: `npm run dev` and `npm run test:apis`
3. **Get API keys**: Start with Requesty and Stripe test keys
4. **Add real flight data**: Later, add Amadeus API
5. **Deploy to staging**: Use `.env.staging.example` when ready

You're in the perfect phase to focus on **local development** with the main `.env` file. The other environment files will be useful later when you're ready for staging and production deployments.