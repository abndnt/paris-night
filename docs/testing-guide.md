# Testing Guide

This document provides comprehensive information about the testing strategy and implementation for the Flight Search SaaS platform.

## Testing Strategy Overview

Our testing approach follows a multi-layered strategy:

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test interactions between different parts of the system
3. **End-to-End Tests** - Test complete user workflows from frontend to backend
4. **Performance Tests** - Test system performance under various load conditions
5. **Security Tests** - Test for vulnerabilities and security issues
6. **Smoke Tests** - Quick tests to verify basic functionality after deployment

## Test Structure

```
├── src/tests/
│   ├── unit/                    # Unit tests for backend services
│   ├── integration/             # Integration tests for API workflows
│   ├── smoke/                   # Smoke tests for deployment verification
│   └── helpers/                 # Test utilities and helpers
├── frontend/src/components/     # Frontend component tests (co-located)
├── e2e/                        # End-to-end tests using Playwright
└── performance/                # Performance and load tests
```

## Running Tests

### Backend Tests

```bash
# Run all backend tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:ci

# Run integration tests only
npm run test:integration

# Run smoke tests
npm run test:smoke
```

### Frontend Tests

```bash
cd frontend

# Run all frontend tests
npm test

# Run tests with coverage
npm run test:ci

# Run tests in watch mode
npm test -- --watch
```

### End-to-End Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with browser UI
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/auth.spec.ts
```

### Performance Tests

```bash
# Run load tests
npm run test:performance

# Run stress tests
npm run test:stress

# Run custom Artillery configuration
npx artillery run performance/custom-test.yml
```

## Test Configuration

### Jest Configuration

The Jest configuration is defined in `jest.config.js`:

- **Test Environment**: Node.js for backend tests
- **Coverage Threshold**: 80% for branches, functions, lines, and statements
- **Test Patterns**: `**/__tests__/**/*.ts` and `**/?(*.)+(spec|test).ts`
- **Module Mapping**: Supports path aliases with `@/` prefix

### Playwright Configuration

E2E tests use Playwright with the following setup:

- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Base URL**: Configurable via `BASE_URL` environment variable
- **Reporters**: HTML, JUnit, and JSON for CI/CD integration
- **Retry Strategy**: 2 retries on CI, 0 retries locally

### Performance Testing

Artillery is used for performance testing with:

- **Load Testing**: Gradual ramp-up to sustained load
- **Stress Testing**: High load to identify breaking points
- **Test Data**: CSV files with realistic test scenarios

## Test Data Management

### Database Setup

Test database is automatically set up and torn down:

```typescript
// Setup test database
await setupTestDatabase();

// Clean up after tests
await cleanupTestDatabase();
```

### Test Fixtures

Common test data is created using helper functions:

```typescript
const testUser = await createTestUser({
  email: 'test@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
});
```

## CI/CD Integration

### GitHub Actions Workflow

The CI/CD pipeline includes:

1. **Linting and Unit Tests** - Run on every push and PR
2. **Integration Tests** - Run with database and Redis services
3. **E2E Tests** - Run against full application stack
4. **Performance Tests** - Run on main branch pushes
5. **Security Scanning** - Vulnerability scanning with Trivy
6. **Deployment** - Automated deployment to staging/production

### Test Environments

- **Local Development**: Uses local database and Redis
- **CI Environment**: Uses Docker services for isolation
- **Staging**: Full environment testing before production
- **Production**: Smoke tests after deployment

## Writing Tests

### Unit Test Example

```typescript
describe('UserService', () => {
  test('should create user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe'
    };

    const user = await userService.createUser(userData);
    
    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);
    expect(user.passwordHash).not.toBe(userData.password);
  });
});
```

### Integration Test Example

```typescript
describe('Flight Search API', () => {
  test('should complete search workflow', async () => {
    const response = await request(app)
      .post('/api/search/flights')
      .set('Authorization', `Bearer ${authToken}`)
      .send(searchCriteria);

    expect(response.status).toBe(200);
    expect(response.body.searchId).toBeDefined();
  });
});
```

### E2E Test Example

```typescript
test('should complete booking flow', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="search-button"]');
  await page.fill('[data-testid="origin"]', 'NYC');
  await page.fill('[data-testid="destination"]', 'LAX');
  await page.click('[data-testid="submit-search"]');
  
  await expect(page.locator('[data-testid="results"]')).toBeVisible();
});
```

## Test Best Practices

### General Guidelines

1. **Test Naming**: Use descriptive test names that explain the expected behavior
2. **Test Structure**: Follow Arrange-Act-Assert pattern
3. **Test Isolation**: Each test should be independent and not rely on others
4. **Mock External Services**: Use mocks for external APIs and services
5. **Test Data**: Use realistic but anonymized test data

### Frontend Testing

1. **Component Testing**: Test components in isolation with React Testing Library
2. **User Interactions**: Test from user's perspective, not implementation details
3. **Accessibility**: Include accessibility tests in component tests
4. **State Management**: Test Redux actions and reducers separately

### Backend Testing

1. **Database Testing**: Use transactions that roll back after each test
2. **API Testing**: Test all HTTP status codes and error conditions
3. **Authentication**: Test both authenticated and unauthenticated scenarios
4. **Validation**: Test input validation and error handling

## Debugging Tests

### Local Debugging

```bash
# Run specific test file
npm test -- --testNamePattern="UserService"

# Run tests with verbose output
npm test -- --verbose

# Debug with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

### E2E Test Debugging

```bash
# Run with browser UI
npm run test:e2e:headed

# Generate trace files
npx playwright test --trace on

# Open trace viewer
npx playwright show-trace trace.zip
```

## Performance Monitoring

### Metrics Collection

Tests collect the following metrics:

- **Response Times**: API endpoint response times
- **Throughput**: Requests per second under load
- **Error Rates**: Percentage of failed requests
- **Resource Usage**: CPU and memory consumption

### Performance Thresholds

- **API Response Time**: < 500ms for 95th percentile
- **Database Queries**: < 100ms for simple queries
- **Page Load Time**: < 2 seconds for initial load
- **Error Rate**: < 1% under normal load

## Continuous Improvement

### Test Metrics

We track the following test metrics:

- **Test Coverage**: Aim for >80% code coverage
- **Test Execution Time**: Keep test suite under 10 minutes
- **Flaky Test Rate**: < 5% of tests should be flaky
- **Bug Detection Rate**: Tests should catch >90% of bugs

### Regular Reviews

- **Weekly**: Review test results and flaky tests
- **Monthly**: Analyze test coverage and performance trends
- **Quarterly**: Review and update testing strategy

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Ensure test database is running
2. **Port Conflicts**: Check for services running on test ports
3. **Timeout Issues**: Increase timeout for slow operations
4. **Memory Leaks**: Properly clean up resources in tests

### Getting Help

- Check the test logs for detailed error messages
- Review the CI/CD pipeline logs for deployment issues
- Consult the team's testing documentation
- Ask for help in the team's communication channels