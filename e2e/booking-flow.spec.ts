import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and perform search
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Perform flight search
    await page.click('[data-testid="chat-tab"]');
    await page.fill('[data-testid="chat-input"]', 'NYC to LAX December 25th');
    await page.click('[data-testid="send-button"]');
    await expect(page.locator('[data-testid="flight-results"]')).toBeVisible();
  });

  test('should complete full booking flow', async ({ page }) => {
    // Select a flight
    await page.click('[data-testid="select-flight-button"]');
    
    // Fill passenger information
    await expect(page.locator('[data-testid="passenger-form"]')).toBeVisible();
    await page.fill('[data-testid="passenger-first-name"]', 'John');
    await page.fill('[data-testid="passenger-last-name"]', 'Doe');
    await page.fill('[data-testid="passenger-dob"]', '1990-01-01');
    await page.click('[data-testid="continue-to-payment"]');
    
    // Payment step
    await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'John Doe');
    
    // Complete booking
    await page.click('[data-testid="complete-booking"]');
    
    // Verify booking confirmation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-number"]')).toBeVisible();
  });

  test('should validate passenger information', async ({ page }) => {
    await page.click('[data-testid="select-flight-button"]');
    
    // Try to continue without filling required fields
    await page.click('[data-testid="continue-to-payment"]');
    
    // Verify validation errors
    await expect(page.locator('[data-testid="first-name-error"]')).toContainText('First name is required');
    await expect(page.locator('[data-testid="last-name-error"]')).toContainText('Last name is required');
  });

  test('should handle payment errors', async ({ page }) => {
    // Mock payment error
    await page.route('**/api/payment/process', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payment declined' })
      });
    });
    
    await page.click('[data-testid="select-flight-button"]');
    
    // Fill passenger info
    await page.fill('[data-testid="passenger-first-name"]', 'John');
    await page.fill('[data-testid="passenger-last-name"]', 'Doe');
    await page.fill('[data-testid="passenger-dob"]', '1990-01-01');
    await page.click('[data-testid="continue-to-payment"]');
    
    // Fill payment info
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'John Doe');
    
    await page.click('[data-testid="complete-booking"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('Payment declined');
  });

  test('should allow booking with points', async ({ page }) => {
    await page.click('[data-testid="select-flight-button"]');
    
    // Switch to points payment
    await page.click('[data-testid="payment-method-points"]');
    
    // Select reward program
    await page.selectOption('[data-testid="reward-program-select"]', 'chase-ultimate-rewards');
    
    // Fill passenger info
    await page.fill('[data-testid="passenger-first-name"]', 'John');
    await page.fill('[data-testid="passenger-last-name"]', 'Doe');
    await page.fill('[data-testid="passenger-dob"]', '1990-01-01');
    
    await page.click('[data-testid="complete-booking"]');
    
    // Verify points booking confirmation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="points-used"]')).toBeVisible();
  });
});