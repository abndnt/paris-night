#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Flight Search SaaS Development Environment\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
  console.log('📝 Creating .env file from template...');
  fs.copyFileSync('.env.example', '.env');
  console.log('✅ .env file created\n');
  
  console.log('⚠️  IMPORTANT: Please update the following in your .env file:');
  console.log('   - REQUESTY_API_KEY (get from https://requesty.ai)');
  console.log('   - STRIPE_SECRET_KEY (get from https://dashboard.stripe.com)');
  console.log('   - JWT_SECRET (generate a secure random string)');
  console.log('');
} else {
  console.log('✅ .env file already exists\n');
}

// Check if Docker is running
try {
  execSync('docker --version', { stdio: 'ignore' });
  console.log('✅ Docker is available\n');
  
  console.log('🐳 Starting services with Docker Compose...');
  try {
    execSync('docker-compose up -d', { stdio: 'inherit' });
    console.log('✅ Services started successfully\n');
  } catch (error) {
    console.log('❌ Failed to start services with Docker');
    console.log('   Please run: docker-compose up -d\n');
  }
} catch (error) {
  console.log('⚠️  Docker not found. Please install Docker to run the full stack\n');
  console.log('   Alternative: Install PostgreSQL and Redis manually\n');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.log('❌ Failed to install dependencies');
  console.log('   Please run: npm install\n');
}

// Build the project
console.log('🔨 Building the project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Project built successfully\n');
} catch (error) {
  console.log('❌ Build failed');
  console.log('   Please check for TypeScript errors\n');
}

// Frontend setup
if (fs.existsSync('frontend')) {
  console.log('🎨 Setting up frontend...');
  try {
    execSync('cd frontend && npm install', { stdio: 'inherit' });
    console.log('✅ Frontend dependencies installed\n');
  } catch (error) {
    console.log('❌ Frontend setup failed');
    console.log('   Please run: cd frontend && npm install\n');
  }
}

console.log('🎉 Setup complete!\n');
console.log('📋 Next Steps:');
console.log('   1. Update your .env file with real API keys');
console.log('   2. Start development: npm run dev');
console.log('   3. Access the app: http://localhost:3000');
console.log('   4. Access PgAdmin: http://localhost:8080');
console.log('   5. Run tests: npm test\n');

console.log('🔗 Useful Commands:');
console.log('   npm run dev          - Start development server');
console.log('   npm run test         - Run all tests');
console.log('   npm run test:e2e     - Run end-to-end tests');
console.log('   npm run test:smoke   - Run smoke tests');
console.log('   docker-compose logs  - View service logs');
console.log('   docker-compose down  - Stop all services\n');

console.log('📚 Documentation:');
console.log('   docs/testing-guide.md         - Testing documentation');
console.log('   docs/security-guidelines.md   - Security best practices');
console.log('   docs/airline-api-integration.md - API integration guide');
console.log('   docs/production-deployment.md  - Production deployment\n');

console.log('🔧 API Integration:');
console.log('   1. Sign up for Amadeus API: https://developers.amadeus.com');
console.log('   2. Update src/config/airline-configs/amadeus.json');
console.log('   3. Test with: npm run test:integration\n');