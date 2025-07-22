import request from 'supertest';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('Smoke Tests', () => {
  describe('Health Checks', () => {
    test('should return healthy status from health endpoint', async () => {
      const response = await request(BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.services).toBeDefined();
    });

    test('should have database connectivity', async () => {
      const response = await request(BASE_URL)
        .get('/api/health/database')
        .expect(200);

      expect(response.body.database).toBe('connected');
    });

    test('should have Redis connectivity', async () => {
      const response = await request(BASE_URL)
        .get('/api/health/redis')
        .expect(200);

      expect(response.body.redis).toBe('connected');
    });
  });

  describe('Authentication Endpoints', () => {
    test('should accept registration requests', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email: `smoke-test-${Date.now()}@example.com`,
          password: 'password123',
          firstName: 'Smoke',
          lastName: 'Test'
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.token).toBeDefined();
    });

    test('should accept login requests', async () => {
      // First register a user
      const email = `smoke-login-${Date.now()}@example.com`;
      await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email,
          password: 'password123',
          firstName: 'Smoke',
          lastName: 'Test'
        });

      // Then login
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email,
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('Core API Endpoints', () => {
    let authToken: string;

    beforeAll(async () => {
      // Register and login to get auth token
      const email = `smoke-api-${Date.now()}@example.com`;
      const registerResponse = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email,
          password: 'password123',
          firstName: 'Smoke',
          lastName: 'Test'
        });

      authToken = registerResponse.body.token;
    });

    test('should handle flight search requests', async () => {
      const response = await request(BASE_URL)
        .post('/api/search/flights')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: 'NYC',
          destination: 'LAX',
          departureDate: '2024-12-25',
          passengers: 1,
          cabinClass: 'economy'
        });

      expect([200, 202]).toContain(response.status);
      expect(response.body.searchId).toBeDefined();
    });

    test('should handle chat session creation', async () => {
      const response = await request(BASE_URL)
        .post('/api/chat/session')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body.sessionId).toBeDefined();
    });

    test('should handle user profile requests', async () => {
      const response = await request(BASE_URL)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('External Service Connectivity', () => {
    let authToken: string;

    beforeAll(async () => {
      const email = `smoke-external-${Date.now()}@example.com`;
      const registerResponse = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email,
          password: 'password123',
          firstName: 'Smoke',
          lastName: 'Test'
        });

      authToken = registerResponse.body.token;
    });

    test('should connect to LLM service', async () => {
      const sessionResponse = await request(BASE_URL)
        .post('/api/chat/session')
        .set('Authorization', `Bearer ${authToken}`);

      const messageResponse = await request(BASE_URL)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionResponse.body.sessionId,
          message: 'Hello, can you help me find flights?'
        });

      expect([200, 202]).toContain(messageResponse.status);
      expect(messageResponse.body.response).toBeDefined();
    });

    test('should connect to airline APIs', async () => {
      const response = await request(BASE_URL)
        .get('/api/search/airlines/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.airlines).toBeDefined();
      expect(Array.isArray(response.body.airlines)).toBe(true);
    });
  });

  describe('Performance Checks', () => {
    test('should respond to health check within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(BASE_URL)
        .get('/api/health')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(BASE_URL)
          .get('/api/health')
          .expect(200)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.body.status).toBe('healthy');
      });
    });
  });
});