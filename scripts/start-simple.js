#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Flight Search SaaS in Simple Mode\n');

// Set environment variables for simplified mode
process.env.NODE_ENV = 'development';
process.env.DISABLE_SENTRY = 'true';
process.env.DISABLE_MONITORING = 'true';

// Start the development server with simplified error tracking
const serverProcess = spawn('npm', ['run', 'dev:simple:direct'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: {
    ...process.env,
    // Override problematic imports
    TS_NODE_COMPILER_OPTIONS: JSON.stringify({
      "skipLibCheck": true,
      "allowSyntheticDefaultImports": true,
      "esModuleInterop": true
    })
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`\n📊 Server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down server...');
  serverProcess.kill('SIGTERM');
});