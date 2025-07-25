# 📊 Environment Files Quick Reference

## 🎯 **For Initial App Testing - You Only Need `.env`**

| File | Purpose | Your Action | Status |
|------|---------|-------------|---------|
| **`.env`** | 🎯 **Your daily development** | ✅ **CREATE THIS** | **ACTIVE** |
| `.env.example` | Template/reference | ❌ Don't modify | Reference only |
| `.env.test` | Automated testing | ❌ Don't modify | Auto-used by tests |
| `.env.staging.example` | Future staging deployment | ❌ Ignore for now | Future use |

## 🚀 Quick Setup (2 minutes)

### **Option 1: Interactive Setup (Recommended)**
```bash
npm run setup:env
```
This will guide you through creating your `.env` file step by step.

### **Option 2: Manual Setup**
```bash
# 1. Copy template
cp .env.example .env

# 2. Edit .env and change these 3 lines:
JWT_SECRET=your-secure-random-string-here
REQUESTY_API_KEY=your-requesty-api-key  # Get from https://requesty.ai
STRIPE_SECRET_KEY=sk_test_your-stripe-key  # Get from https://dashboard.stripe.com
```

## 🔑 API Keys Priority for Testing

| Priority | Service | Required? | Where to Get | Used For |
|----------|---------|-----------|--------------|----------|
| **HIGH** | JWT Secret | ✅ Required | Generate random string | Authentication |
| **MEDIUM** | Requesty API | 🔶 Recommended | https://requesty.ai | AI chat features |
| **MEDIUM** | Stripe Test | 🔶 Recommended | https://dashboard.stripe.com | Payment testing |
| **LOW** | Amadeus API | ⚪ Optional | https://developers.amadeus.com | Real flight data |

## 📁 What Each File Contains

### **`.env` (Your Working File)**
```bash
# This is what you'll create and use daily
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://flight_user:flight_password@localhost:5432/flight_search_db
JWT_SECRET=your-actual-secure-secret-here
REQUESTY_API_KEY=your-actual-requesty-key-here
STRIPE_SECRET_KEY=sk_test_your-actual-stripe-key-here
# ... (all other settings from template)
```

### **`.env.test` (Auto-used by Tests)**
```bash
# Used automatically when you run: npm test
NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/flight_search_test
JWT_SECRET=test-secret-key-for-testing-only
REQUESTY_API_KEY=test-api-key
STRIPE_SECRET_KEY=sk_test_test_key
LOG_LEVEL=error
```

### **`.env.example` (Template - Don't Modify)**
```bash
# Template with placeholder values
JWT_SECRET=your-super-secret-jwt-key-change-in-production
REQUESTY_API_KEY=your-requesty-api-key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
# ... (all settings with placeholder values)
```

### **`.env.staging.example` (Future Use - Ignore for Now)**
```bash
# For when you deploy to staging later
NODE_ENV=staging
DATABASE_URL=postgresql://staging_user:staging_password@postgres:5432/flight_search_staging
# ... (staging-specific settings)
```

## ✅ Testing Your Setup

After creating your `.env` file:

```bash
# 1. Start services
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Test everything works
npm run test:apis
```

## 🔒 Security Notes

- ✅ `.env` is in `.gitignore` - won't be committed
- ✅ Use test API keys for development
- ✅ Generate strong JWT secrets
- ❌ Never commit real API keys to Git

## 🐛 Common Issues

### **"Cannot find .env file"**
```bash
# Create it from template
cp .env.example .env
```

### **"Database connection failed"**
```bash
# Start PostgreSQL
docker-compose up -d postgres
```

### **"Invalid JWT secret"**
```bash
# Make sure JWT_SECRET is set in .env
echo "JWT_SECRET=your-secure-random-string-here" >> .env
```

## 🎯 Summary for Testing Phase

**You only need to focus on `.env`:**

1. **Create**: `cp .env.example .env` or `npm run setup:env`
2. **Update**: Add your API keys (JWT, Requesty, Stripe)
3. **Test**: `npm run dev` and `npm run test:apis`
4. **Ignore**: All other env files for now

The other environment files are for automated testing (`.env.test`) and future deployment (`.env.staging.example`). You don't need to touch them during initial app testing.