import request from 'supertest';
import { app } from '../../server';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/testDatabase';

describe('User Workflows Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Register and login a test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  describe('Complete Flight Search and Booking Workflow', () => {
    test('should complete full user journey from search to booking', async () => {
      // 1. Search for flights
      const searchResponse = await request(app)
        .post('/api/search/flights')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: 'NYC',
          destination: 'LAX',
          departureDate: '2024-12-25',
          passengers: 1,
          cabinClass: 'economy'
        });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.searchId).toBeDefined();
      const searchId = searchResponse.body.searchId;

      // 2. Get search results
      const resultsResponse = await request(app)
        .get(`/api/search/results/${searchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(resultsResponse.status).toBe(200);
      expect(resultsResponse.body.results).toHaveLength.greaterThan(0);
      const selectedFlight = resultsResponse.body.results[0];

      // 3. Initiate booking
      const bookingResponse = await request(app)
        .post('/api/booking/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          flightId: selectedFlight.id,
          passengers: [{
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01'
          }]
        });

      expect(bookingResponse.status).toBe(200);
      expect(bookingResponse.body.bookingId).toBeDefined();
      const bookingId = bookingResponse.body.bookingId;

      // 4. Process payment
      const paymentResponse = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId,
          paymentMethod: 'card',
          cardDetails: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        });

      expect(paymentResponse.status).toBe(200);
      expect(paymentResponse.body.confirmationNumber).toBeDefined();

      // 5. Verify booking status
      const statusResponse = await request(app)
        .get(`/api/booking/status/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status).toBe('confirmed');
    });

    test('should handle booking failure gracefully', async () => {
      // Search and select flight
      const searchResponse = await request(app)
        .post('/api/search/flights')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: 'NYC',
          destination: 'LAX',
          departureDate: '2024-12-25',
          passengers: 1,
          cabinClass: 'economy'
        });

      const resultsResponse = await request(app)
        .get(`/api/search/results/${searchResponse.body.searchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const selectedFlight = resultsResponse.body.results[0];

      // Initiate booking
      const bookingResponse = await request(app)
        .post('/api/booking/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          flightId: selectedFlight.id,
          passengers: [{
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01'
          }]
        });

      const bookingId = bookingResponse.body.bookingId;

      // Attempt payment with invalid card
      const paymentResponse = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId,
          paymentMethod: 'card',
          cardDetails: {
            number: '4000000000000002', // Declined card
            expMonth: 12,
            expYear: 2025,
            cvc: '123'
          }
        });

      expect(paymentResponse.status).toBe(400);
      expect(paymentResponse.body.error).toContain('declined');

      // Verify booking status is failed
      const statusResponse = await request(app)
        .get(`/api/booking/status/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status).toBe('failed');
    });
  });

  describe('Chat-Based Flight Search Workflow', () => {
    test('should handle conversational flight search', async () => {
      // 1. Create chat session
      const sessionResponse = await request(app)
        .post('/api/chat/session')
        .set('Authorization', `Bearer ${authToken}`);

      expect(sessionResponse.status).toBe(200);
      const sessionId = sessionResponse.body.sessionId;

      // 2. Send flight search message
      const messageResponse = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          message: 'I want to fly from New York to Los Angeles on December 25th'
        });

      expect(messageResponse.status).toBe(200);
      expect(messageResponse.body.response).toContain('flight');
      expect(messageResponse.body.searchResults).toBeDefined();

      // 3. Follow up with clarification
      const clarificationResponse = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          message: 'Show me only morning flights'
        });

      expect(clarificationResponse.status).toBe(200);
      expect(clarificationResponse.body.searchResults).toBeDefined();

      // 4. Get chat history
      const historyResponse = await request(app)
        .get(`/api/chat/history/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.messages).toHaveLength(4); // 2 user messages + 2 bot responses
    });
  });

  describe('Reward Points Workflow', () => {
    test('should manage reward accounts and point valuations', async () => {
      // 1. Add reward account
      const accountResponse = await request(app)
        .post('/api/points/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          program: 'chase-ultimate-rewards',
          accountNumber: '1234567890',
          credentials: {
            username: 'testuser',
            password: 'testpass'
          }
        });

      expect(accountResponse.status).toBe(201);
      expect(accountResponse.body.accountId).toBeDefined();

      // 2. Get points balance
      const balanceResponse = await request(app)
        .get(`/api/points/balances/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.body.accounts).toHaveLength(1);

      // 3. Get point valuations for a flight
      const searchResponse = await request(app)
        .post('/api/search/flights')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: 'NYC',
          destination: 'LAX',
          departureDate: '2024-12-25',
          passengers: 1,
          cabinClass: 'economy'
        });

      const resultsResponse = await request(app)
        .get(`/api/search/results/${searchResponse.body.searchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const selectedFlight = resultsResponse.body.results[0];

      const valuationResponse = await request(app)
        .post('/api/points/valuations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          flightId: selectedFlight.id,
          userId
        });

      expect(valuationResponse.status).toBe(200);
      expect(valuationResponse.body.valuations).toBeDefined();
      expect(valuationResponse.body.bestValue).toBeDefined();
    });
  });

  describe('User Preferences and Personalization Workflow', () => {
    test('should save and apply user preferences', async () => {
      // 1. Set travel preferences
      const preferencesResponse = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferredAirlines: ['American Airlines', 'Delta'],
          preferredAirports: ['JFK', 'LAX'],
          seatPreference: 'aisle',
          maxLayovers: 1,
          preferredCabinClass: 'economy'
        });

      expect(preferencesResponse.status).toBe(200);

      // 2. Search for flights (should apply preferences)
      const searchResponse = await request(app)
        .post('/api/search/flights')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: 'NYC',
          destination: 'LAX',
          departureDate: '2024-12-25',
          passengers: 1,
          cabinClass: 'economy'
        });

      const resultsResponse = await request(app)
        .get(`/api/search/results/${searchResponse.body.searchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(resultsResponse.status).toBe(200);
      // Results should be filtered/sorted based on preferences
      const results = resultsResponse.body.results;
      const preferredAirlineResults = results.filter((flight: any) => 
        ['American Airlines', 'Delta'].includes(flight.airline)
      );
      expect(preferredAirlineResults.length).toBeGreaterThan(0);
    });
  });
});