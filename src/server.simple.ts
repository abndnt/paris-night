import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { logger } from './utils/logger';

// Simplified error tracking
import * as errorTracking from './utils/errorTracking.simple';

const app = express();

// Initialize simplified error tracking
errorTracking.initializeErrorTracking();

// Basic middleware
app.use(helmet());
app.use(compression());
app.use(cors(config.cors));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    version: '1.0.0'
  });
});

// Basic flight search endpoint (mock)
app.post('/api/flights/search', (req, res) => {
  const { origin, destination, departureDate, passengers = 1 } = req.body;
  
  // Mock flight data
  const mockFlights = [
    {
      id: 'FL001',
      airline: 'Mock Airlines',
      flightNumber: 'MA123',
      origin,
      destination,
      departureTime: `${departureDate}T08:00:00Z`,
      arrivalTime: `${departureDate}T12:00:00Z`,
      price: 299.99,
      currency: 'USD',
      duration: 240, // minutes
      layovers: 0
    },
    {
      id: 'FL002', 
      airline: 'Test Airways',
      flightNumber: 'TA456',
      origin,
      destination,
      departureTime: `${departureDate}T14:00:00Z`,
      arrivalTime: `${departureDate}T18:30:00Z`,
      price: 349.99,
      currency: 'USD',
      duration: 270,
      layovers: 1
    }
  ];

  res.json({
    success: true,
    flights: mockFlights,
    totalResults: mockFlights.length,
    searchCriteria: { origin, destination, departureDate, passengers }
  });
});

// Chat endpoint (mock)
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  
  res.json({
    success: true,
    response: `I understand you're looking for flights. You said: "${message}". This is a mock response for testing.`,
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(errorTracking.sentryErrorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
const port = config.server.port;
const host = config.server.host;

app.listen(port, host, () => {
  logger.info(`🚀 Flight Search SaaS Server running on http://${host}:${port}`);
  logger.info(`📊 Environment: ${config.server.nodeEnv}`);
  logger.info(`🔍 Health check: http://${host}:${port}/api/health`);
  logger.info(`✈️  Flight search: POST http://${host}:${port}/api/flights/search`);
  logger.info(`💬 Chat: POST http://${host}:${port}/api/chat`);
});

export default app;