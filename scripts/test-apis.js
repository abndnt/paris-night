#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing Flight Search SaaS APIs\n');

  const tests = [
    {
      name: 'Health Check',
      url: `${BASE_URL}/api/health`,
      method: 'GET'
    },
    {
      name: 'Flight Search (Mock)',
      url: `${BASE_URL}/api/flights/search`,
      method: 'POST',
      data: {
        origin: 'LAX',
        destination: 'JFK',
        departureDate: '2024-06-15',
        passengers: 1,
        cabinClass: 'economy'
      }
    },
    {
      name: 'Chat Health Check',
      url: `${BASE_URL}/api/chat/health`,
      method: 'GET'
    },
    {
      name: 'Admin Health Check',
      url: `${BASE_URL}/api/admin/health`,
      method: 'GET'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      
      const config = {
        method: test.method,
        url: test.url,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (test.data) {
        config.data = test.data;
      }

      const response = await axios(config);
      console.log(`✅ ${test.name}: ${response.status} ${response.statusText}`);
      
      if (test.name === 'Flight Search (Mock)') {
        console.log(`   Found ${response.data.flights?.length || 0} flights`);
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${test.name}: ${error.response.status} ${error.response.statusText}`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${test.name}: Server not running (${error.code})`);
      } else {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  console.log('🔗 WebSocket Test');
  console.log('   To test WebSocket connections:');
  console.log('   1. Open browser to http://localhost:3000');
  console.log('   2. Open developer tools');
  console.log('   3. Check Network tab for WebSocket connections\n');

  console.log('📊 Performance Test');
  console.log('   Run load tests with: npm run test:performance');
  console.log('   Run stress tests with: npm run test:stress\n');
}

// Run the tests
testAPI().catch(console.error);