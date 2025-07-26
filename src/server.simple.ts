import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { logger } from './utils/logger';
import { AmadeusAdapter } from './adapters/AmadeusAdapter';

// Simplified error tracking
import * as errorTracking from './utils/errorTracking.simple';

const app = express();
// Initialize Amadeus adapter
const amadeusConfig = {
  name: 'amadeus',
  apiKey: process.env.AMADEUS_CLIENT_ID || '',
  baseUrl: 'https://test.api.amadeus.com/v2',
  timeout: 30000,
  credentials: {
    clientId: process.env.AMADEUS_CLIENT_ID || '',
    clientSecret: process.env.AMADEUS_CLIENT_SECRET || '',
  },
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
  },
  retryConfig: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
  },
};

// Simple in-memory implementations for testing
class SimpleRateLimiter {
  async checkLimit(key: string): Promise<boolean> {
    return true; // Always allow for testing
  }
  
  async incrementCounter(key: string): Promise<void> {
    // No-op for testing
  }
  
  async getRemainingRequests(key: string): Promise<number> {
    return 1000; // Always return high limit for testing
  }
}

class SimpleCache {
  private cache = new Map();
  
  async get(key: string): Promise<any> {
    return this.cache.get(key) || null;
  }
  
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value);
    if (ttlSeconds) {
      setTimeout(() => this.cache.delete(key), ttlSeconds * 1000);
    }
  }
  
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
  
  generateKey(searchCriteria: any, airlineName: string): string {
    return `${airlineName}:${JSON.stringify(searchCriteria)}`;
  }
}

const rateLimiter = new SimpleRateLimiter() as any;
const cache = new SimpleCache() as any;
const amadeusAdapter = new AmadeusAdapter(amadeusConfig, rateLimiter, cache);

// Initialize simplified error tracking
errorTracking.initializeErrorTracking();

// Basic middleware
app.use(helmet());
app.use(compression());
app.use(cors(config.cors));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    version: '1.0.0'
  });
});

// Flight search endpoint with Amadeus integration
app.post('/api/flights/search', async (req, res) => {
  logger.info('Flight search request received:', req.body);
  const { origin, destination, departureDate, returnDate, passengers, cabinClass } = req.body;
  
  try {
    // Try to use Amadeus API first
    logger.info('Attempting Amadeus API search with params:', { origin, destination, departureDate, returnDate, passengers, cabinClass });
    
    // Validate airport codes (should be 3-letter IATA codes)
    const originCode = origin.toUpperCase().trim();
    const destinationCode = destination.toUpperCase().trim();
    
    if (originCode.length !== 3 || destinationCode.length !== 3) {
      logger.warn(`Invalid airport codes: origin=${originCode}, destination=${destinationCode}. Using mock data.`);
      throw new Error('Invalid airport codes - must be 3-letter IATA codes');
    }

    const searchRequest = {
      searchCriteria: {
        origin: originCode,
        destination: destinationCode,
        departureDate: new Date(departureDate),
        returnDate: returnDate ? new Date(returnDate) : undefined,
        passengers: passengers.adults + passengers.children + passengers.infants,
        cabinClass: cabinClass || 'economy',
        flexible: false,
      },
      requestId: `search_${Date.now()}`,
      timestamp: new Date(),
      preferences: {
        maxResults: 50,
      },
    };

    logger.info('Calling Amadeus adapter with request:', JSON.stringify(searchRequest, null, 2));
    const amadeusResponse = await amadeusAdapter.searchFlights(searchRequest);
    logger.info('Amadeus response received:', { flightCount: amadeusResponse.flights?.length, totalResults: amadeusResponse.totalResults });
    
    if (amadeusResponse.flights && amadeusResponse.flights.length > 0) {
      logger.info(`Found ${amadeusResponse.flights.length} flights from Amadeus`);
      return res.json({
        success: true,
        flights: amadeusResponse.flights,
        totalResults: amadeusResponse.totalResults,
        searchCriteria: { origin, destination, departureDate, returnDate, passengers, cabinClass },
        source: 'amadeus'
      });
    } else {
      logger.warn('Amadeus returned no flights, falling back to mock data');
    }
  } catch (error: any) {
    logger.error('Amadeus API error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
      response: error.response,
      origin,
      destination,
      departureDate,
      returnDate
    });
    // Fall back to mock data if Amadeus fails
  }

  // Fallback to mock flight data
  logger.info('Using mock flight data as fallback');
  const mockFlights = [
    {
      id: 'FL001',
      airline: 'Mock Airlines',
      flightNumber: 'MA123',
      route: [
        {
          airline: 'Mock Airlines',
          flightNumber: 'MA123',
          origin,
          destination,
          departureTime: new Date(`${departureDate}T08:00:00Z`),
          arrivalTime: new Date(`${departureDate}T12:00:00Z`),
          duration: 240,
          aircraft: 'Boeing 737'
        }
      ],
      pricing: {
        cashPrice: 299.99,
        currency: 'USD',
        pointsOptions: [
          {
            program: 'Chase Ultimate Rewards',
            pointsRequired: 30000,
            cashComponent: 0,
            transferRatio: 1.0,
            bestValue: true
          }
        ],
        taxes: 45.20,
        fees: 25.00,
        totalPrice: 370.19
      },
      availability: {
        availableSeats: 15,
        bookingClass: cabinClass === 'economy' ? 'Y' : 'J',
        fareBasis: 'YLOW'
      },
      duration: 240,
      layovers: 0,
      score: 85
    },
    {
      id: 'FL002', 
      airline: 'Test Airways',
      flightNumber: 'TA456',
      route: [
        {
          airline: 'Test Airways',
          flightNumber: 'TA456',
          origin,
          destination: 'ATL',
          departureTime: new Date(`${departureDate}T14:00:00Z`),
          arrivalTime: new Date(`${departureDate}T16:30:00Z`),
          duration: 150,
          aircraft: 'Airbus A320'
        },
        {
          airline: 'Test Airways',
          flightNumber: 'TA789',
          origin: 'ATL',
          destination,
          departureTime: new Date(`${departureDate}T17:45:00Z`),
          arrivalTime: new Date(`${departureDate}T19:30:00Z`),
          duration: 105,
          aircraft: 'Airbus A320'
        }
      ],
      pricing: {
        cashPrice: 349.99,
        currency: 'USD',
        pointsOptions: [
          {
            program: 'American Express MR',
            pointsRequired: 42000,
            cashComponent: 50.00,
            transferRatio: 1.2,
            bestValue: false
          }
        ],
        taxes: 52.30,
        fees: 35.00,
        totalPrice: 437.29
      },
      availability: {
        availableSeats: 8,
        bookingClass: cabinClass === 'economy' ? 'Y' : 'J',
        fareBasis: 'YMED'
      },
      duration: 330,
      layovers: 1,
      layoverDuration: 75,
      score: 72
    },
    {
      id: 'FL003',
      airline: 'Premium Air',
      flightNumber: 'PA101',
      route: [
        {
          airline: 'Premium Air',
          flightNumber: 'PA101',
          origin,
          destination,
          departureTime: new Date(`${departureDate}T10:30:00Z`),
          arrivalTime: new Date(`${departureDate}T14:15:00Z`),
          duration: 225,
          aircraft: 'Boeing 787'
        }
      ],
      pricing: {
        cashPrice: 189.99,
        currency: 'USD',
        pointsOptions: [
          {
            program: 'Capital One Venture',
            pointsRequired: 19000,
            cashComponent: 0,
            transferRatio: 1.0,
            bestValue: true
          }
        ],
        taxes: 38.50,
        fees: 20.00,
        totalPrice: 248.49
      },
      availability: {
        availableSeats: 25,
        bookingClass: cabinClass === 'economy' ? 'Y' : 'J',
        fareBasis: 'YSALE'
      },
      duration: 225,
      layovers: 0,
      score: 92
    }
  ];

  // Add return flights if round trip
  let allFlights = [...mockFlights];
  if (returnDate) {
    const returnFlights = mockFlights.map(flight => ({
      ...flight,
      id: flight.id + '_RETURN',
      route: flight.route.map(segment => ({
        ...segment,
        origin: segment.destination,
        destination: segment.origin,
        departureTime: new Date(`${returnDate}T${segment.departureTime.toISOString().split('T')[1]}`),
        arrivalTime: new Date(`${returnDate}T${segment.arrivalTime.toISOString().split('T')[1]}`)
      }))
    }));
    allFlights = [...allFlights, ...returnFlights];
  }

  res.json({
    success: true,
    flights: allFlights,
    totalResults: allFlights.length,
    searchCriteria: { origin, destination, departureDate, returnDate, passengers, cabinClass },
    source: 'mock'
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

// Auth endpoints (mock)
app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  // Basic validation
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Email, password, firstName, and lastName are required'
    });
  }
  
  // Mock successful registration
  const mockUser = {
    id: `user_${Date.now()}`,
    email,
    firstName,
    lastName,
    createdAt: new Date().toISOString()
  };
  
  const mockToken = `mock_token_${Date.now()}`;
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: mockUser,
    token: mockToken
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing credentials',
      message: 'Email and password are required'
    });
  }
  
  // Mock successful login
  const mockUser = {
    id: `user_${Date.now()}`,
    email,
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date().toISOString()
  };
  
  const mockToken = `mock_token_${Date.now()}`;
  
  res.json({
    success: true,
    message: 'Login successful',
    user: mockUser,
    token: mockToken
  });
});

app.get('/api/auth/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No valid token provided'
    });
  }
  
  // Mock user profile
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    user: mockUser
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