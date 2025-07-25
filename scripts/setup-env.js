#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function generateJWTSecret() {
  return crypto.randomBytes(64).toString('hex');
}

async function setupEnvironment() {
  console.log('🔧 Flight Search SaaS - Environment Setup\n');
  
  // Check if .env already exists
  if (fs.existsSync('.env')) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('✅ Keeping existing .env file');
      rl.close();
      return;
    }
  }

  console.log('📝 Setting up your .env file for local development...\n');

  // Read the template
  const template = fs.readFileSync('.env.example', 'utf8');
  let envContent = template;

  // 1. JWT Secret
  console.log('🔐 JWT Secret Configuration');
  const useGeneratedJWT = await question('Generate a secure JWT secret automatically? (Y/n): ');
  
  let jwtSecret;
  if (useGeneratedJWT.toLowerCase() !== 'n') {
    jwtSecret = generateJWTSecret();
    console.log('✅ Generated secure JWT secret');
  } else {
    jwtSecret = await question('Enter your JWT secret (or press Enter for default): ');
    if (!jwtSecret) {
      jwtSecret = 'flight-search-development-jwt-secret-2024-change-for-production';
    }
  }
  
  envContent = envContent.replace('your-super-secret-jwt-key-change-in-production', jwtSecret);

  // 2. Requesty API Key
  console.log('\n🤖 Requesty API Configuration (for AI features)');
  console.log('   Sign up at: https://requesty.ai');
  const requestyKey = await question('Enter your Requesty API key (or press Enter to use mock): ');
  
  if (requestyKey) {
    envContent = envContent.replace('your-requesty-api-key', requestyKey);
    console.log('✅ Requesty API key configured');
  } else {
    envContent = envContent.replace('your-requesty-api-key', 'mock-requesty-key-for-testing');
    console.log('⚠️  Using mock Requesty key - AI features will be limited');
  }

  // 3. Stripe API Key
  console.log('\n💳 Stripe Configuration (for payments)');
  console.log('   Get test keys from: https://dashboard.stripe.com');
  const stripeKey = await question('Enter your Stripe test key (sk_test_...): ');
  
  if (stripeKey && stripeKey.startsWith('sk_test_')) {
    envContent = envContent.replace('sk_test_your_stripe_secret_key', stripeKey);
    console.log('✅ Stripe test key configured');
  } else if (stripeKey) {
    console.log('⚠️  Warning: Make sure to use test keys (sk_test_...) for development');
    envContent = envContent.replace('sk_test_your_stripe_secret_key', stripeKey);
  } else {
    envContent = envContent.replace('sk_test_your_stripe_secret_key', 'sk_test_mock_key_for_testing');
    console.log('⚠️  Using mock Stripe key - payments will be simulated');
  }

  // 4. Stripe Webhook Secret (optional)
  const webhookSecret = await question('Enter Stripe webhook secret (optional, press Enter to skip): ');
  if (webhookSecret) {
    envContent = envContent.replace('whsec_your_stripe_webhook_secret', webhookSecret);
  } else {
    envContent = envContent.replace('whsec_your_stripe_webhook_secret', 'whsec_mock_webhook_secret');
  }

  // 5. Amadeus API (optional)
  console.log('\n✈️  Amadeus API Configuration (optional - for real flight data)');
  console.log('   Sign up at: https://developers.amadeus.com');
  const setupAmadeus = await question('Set up Amadeus API now? (y/N): ');
  
  if (setupAmadeus.toLowerCase() === 'y') {
    const amadeusClientId = await question('Enter Amadeus Client ID: ');
    const amadeusClientSecret = await question('Enter Amadeus Client Secret: ');
    
    if (amadeusClientId && amadeusClientSecret) {
      envContent += `\n# Amadeus API Configuration\nAMADEUS_CLIENT_ID=${amadeusClientId}\nAMADEUS_CLIENT_SECRET=${amadeusClientSecret}\n`;
      console.log('✅ Amadeus API configured');
    }
  } else {
    console.log('⏭️  Skipping Amadeus API - you can add this later');
  }

  // Write the .env file
  fs.writeFileSync('.env', envContent);
  
  console.log('\n🎉 Environment setup complete!');
  console.log('\n📋 Summary:');
  console.log(`   ✅ JWT Secret: ${jwtSecret ? 'Configured' : 'Default'}`);
  console.log(`   ✅ Requesty API: ${requestyKey ? 'Real key' : 'Mock key'}`);
  console.log(`   ✅ Stripe API: ${stripeKey ? 'Real test key' : 'Mock key'}`);
  console.log(`   ✅ Database: PostgreSQL (Docker)`);
  console.log(`   ✅ Cache: Redis (Docker)`);
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Start services: docker-compose up -d');
  console.log('   2. Install dependencies: npm install');
  console.log('   3. Start development: npm run dev');
  console.log('   4. Test APIs: npm run test:apis');
  
  console.log('\n📚 Need help?');
  console.log('   - Read ENV_SETUP_GUIDE.md for detailed information');
  console.log('   - Check GETTING_STARTED.md for complete setup guide');
  
  rl.close();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled');
  rl.close();
  process.exit(0);
});

setupEnvironment().catch(console.error);