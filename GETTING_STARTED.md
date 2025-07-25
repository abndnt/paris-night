# 🚀 Getting Started with Flight Search SaaS

Welcome to your complete Flight Search SaaS platform! This guide will help you get up and running quickly.

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose (recommended)
- **Git** for version control

## 🏃‍♂️ Quick Start (5 minutes)

### 1. **Automated Setup**
```bash
# Run the automated setup script
npm run setup
```

This script will:
- Create your `.env` file from template
- Start Docker services (PostgreSQL, Redis, PgAdmin)
- Install all dependencies
- Build the project
- Set up the frontend

### 2. **Manual Setup** (if automated setup fails)
```bash
# Copy environment file
cp .env.example .env

# Start services
docker-compose up -d

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Build the project
npm run build
```

### 3. **Start Development**
```bash
# Start the backend
npm run dev

# In another terminal, start the frontend
cd frontend && npm start
```

### 4. **Test Everything Works**
```bash
# Test all APIs
npm run test:apis

# Run the test suite
npm test
```

## 🌐 Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3000/api
- **PgAdmin**: http://localhost:8080 (admin@flightsearch.com / admin123)
- **Health Check**: http://localhost:3000/api/health

## 🔑 Essential Configuration

### **Update Your .env File**

```bash
# Required API Keys (get these first!)
REQUESTY_API_KEY=your-requesty-api-key-here
STRIPE_SECRET_KEY=sk_test_your-stripe-key-here
JWT_SECRET=your-super-secret-jwt-key-change-this

# Optional: Amadeus API (for real flight data)
AMADEUS_CLIENT_ID=your-amadeus-client-id
AMADEUS_CLIENT_SECRET=your-amadeus-client-secret
```

### **Where to Get API Keys:**

1. **Requesty API** (for AI/LLM features):
   - Sign up: https://requesty.ai
   - Free tier available
   - Used for: Chat interface, AI-powered search

2. **Stripe** (for payments):
   - Sign up: https://dashboard.stripe.com
   - Use test keys for development
   - Used for: Payment processing, subscriptions

3. **Amadeus** (for real flight data):
   - Sign up: https://developers.amadeus.com
   - Free tier: 2,000 calls/month
   - Used for: Real flight search data

## 🧪 Testing Your Setup

### **1. Basic Health Check**
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"healthy","timestamp":"..."}
```

### **2. Flight Search Test**
```bash
curl -X POST http://localhost:3000/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "LAX",
    "destination": "JFK", 
    "departureDate": "2024-06-15",
    "passengers": 1,
    "cabinClass": "economy"
  }'
```

### **3. Run All Tests**
```bash
# Unit and integration tests
npm test

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance
```

## 🔌 Connecting Real Flight APIs

### **Phase 1: Amadeus Integration** (Recommended First)

1. **Get Amadeus API Credentials**:
   ```bash
   # Sign up at: https://developers.amadeus.com
   # Get your Client ID and Client Secret
   ```

2. **Update Configuration**:
   ```bash
   # Edit src/config/airline-configs/amadeus.json
   {
     "credentials": {
       "clientId": "your-amadeus-client-id",
       "clientSecret": "your-amadeus-client-secret"
     }
   }
   ```

3. **Test Amadeus Integration**:
   ```bash
   # The AmadeusAdapter is already implemented!
   # Test it with:
   npm run test:integration
   ```

### **Phase 2: Additional APIs**

The framework supports easy integration of:
- **Skyscanner API**: Flight search and price alerts
- **Sabre API**: Enterprise GDS access
- **Travelport API**: Real-time inventory

See `docs/airline-api-integration.md` for detailed integration guides.

## 🎯 Key Features to Test

### **1. Flight Search**
- Mock data works out of the box
- AI-powered chat interface
- Advanced filtering and sorting

### **2. Booking System**
- Complete booking workflow
- Payment processing (Stripe)
- Points and mixed payments

### **3. Reward Points**
- Points tracking and management
- Transfer recommendations
- Airline program integration

### **4. Admin Dashboard**
- System health monitoring
- Analytics and metrics
- Error tracking

### **5. PWA Features**
- Offline support
- Mobile-responsive design
- Push notifications

## 🚀 Development Workflow

### **Daily Development**
```bash
# Start development servers
npm run dev                    # Backend
cd frontend && npm start       # Frontend

# Run tests while developing
npm run test:watch            # Backend tests
cd frontend && npm test       # Frontend tests
```

### **Before Committing**
```bash
# Run full test suite
npm run test:ci

# Check code quality
npm run lint

# Test E2E functionality
npm run test:e2e
```

### **Performance Testing**
```bash
# Load testing
npm run test:performance

# Stress testing  
npm run test:stress

# Smoke testing (post-deployment)
npm run test:smoke
```

## 📊 Monitoring and Debugging

### **Application Logs**
```bash
# View all service logs
docker-compose logs -f

# View specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### **Database Access**
- **PgAdmin**: http://localhost:8080
- **Direct Connection**: 
  ```bash
  psql postgresql://flight_user:flight_password@localhost:5432/flight_search_db
  ```

### **Redis Monitoring**
```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Monitor commands
MONITOR
```

## 🔧 Troubleshooting

### **Common Issues**

1. **Port Already in Use**:
   ```bash
   # Kill processes on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Docker Issues**:
   ```bash
   # Reset Docker environment
   docker-compose down -v
   docker-compose up -d
   ```

3. **Database Connection Issues**:
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps postgres
   
   # Reset database
   docker-compose down postgres
   docker-compose up -d postgres
   ```

4. **Build Errors**:
   ```bash
   # Clean build
   rm -rf dist node_modules
   npm install
   npm run build
   ```

### **Getting Help**

- Check `docs/` folder for detailed documentation
- Review test files for usage examples
- Check GitHub issues for known problems

## 🎯 Next Steps

### **Immediate (Week 1)**
1. ✅ Get the app running locally
2. ✅ Test basic functionality
3. ✅ Set up Amadeus API integration
4. ✅ Deploy to staging environment

### **Short Term (Month 1)**
1. 🔄 Integrate additional flight APIs
2. 🔄 Set up production monitoring
3. 🔄 Implement user authentication
4. 🔄 Add payment processing

### **Long Term (Quarter 1)**
1. 📈 Scale to handle production traffic
2. 📈 Add advanced analytics
3. 📈 Implement mobile app
4. 📈 Add more airline partnerships

## 📚 Documentation

- **[Testing Guide](docs/testing-guide.md)**: Comprehensive testing documentation
- **[Security Guidelines](docs/security-guidelines.md)**: Security best practices
- **[API Integration](docs/airline-api-integration.md)**: Airline API integration
- **[Production Deployment](docs/production-deployment.md)**: Production setup
- **[Production Runbooks](docs/production-runbooks.md)**: Operations guide

## 🎉 You're Ready!

Your Flight Search SaaS platform is now ready for development. The foundation is solid, the tests are comprehensive, and the architecture is scalable.

**Happy coding!** 🚀

---

*Need help? Check the documentation or create an issue in the repository.*