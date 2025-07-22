import { test, expect } from '@playwright/test';

test.describe('Flight Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should perform basic flight search via chat', async ({ page }) => {
    // Navigate to chat interface
    await page.click('[data-testid="chat-tab"]');
    
    // Send flight search message
    await page.fill('[data-testid="chat-input"]', 'I want to fly from NYC to LAX on December 25th');
    await page.click('[data-testid="send-button"]');
    
    // Wait for response
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('flight options');
    
    // Verify search results appear
    await expect(page.locator('[data-testid="flight-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="flight-card"]').first()).toBeVisible();
  });

  test('should filter search results', async ({ page }) => {
    // Perform search first
    await page.click('[data-testid="chat-tab"]');
    await page.fill('[data-testid="chat-input"]', 'NYC to LAX December 25th');
    await page.click('[data-testid="send-button"]');
    
    // Wait for results
    await expect(page.locator('[data-testid="flight-results"]')).toBeVisible();
    
    // Apply filters
    await page.click('[data-testid="filter-button"]');
    await page.selectOption('[data-testid="airline-filter"]', 'American Airlines');
    await page.click('[data-testid="apply-filters"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="flight-card"]').first()).toContainText('American Airlines');
  });

  test('should toggle between cash and points pricing', async ({ page }) => {
    // Perform search
    await page.click('[data-testid="chat-tab"]');
    await page.fill('[data-testid="chat-input"]', 'NYC to LAX December 25th');
    await page.click('[data-testid="send-button"]');
    
    await expect(page.locator('[data-testid="flight-results"]')).toBeVisible();
    
    // Toggle to points view
    await page.click('[data-testid="pricing-toggle"]');
    
    // Verify points pricing is shown
    await expect(page.locator('[data-testid="flight-card"]').first()).toContainText('points');
    
    // Toggle back to cash
    await page.click('[data-testid="pricing-toggle"]');
    
    // Verify cash pricing is shown
    await expect(page.locator('[data-testid="flight-card"]').first()).toContainText('$');
  });

  test('should show flight details modal', async ({ page }) => {
    // Perform search
    await page.click('[data-testid="chat-tab"]');
    await page.fill('[data-testid="chat-input"]', 'NYC to LAX December 25th');
    await page.click('[data-testid="send-button"]');
    
    await expect(page.locator('[data-testid="flight-results"]')).toBeVisible();
    
    // Click on flight details
    await page.click('[data-testid="flight-details-button"]');
    
    // Verify modal opens
    await expect(page.locator('[data-testid="flight-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="flight-segments"]')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-modal"]');
    await expect(page.locator('[data-testid="flight-details-modal"]')).not.toBeVisible();
  });

  test('should handle search errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/search/flights', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Search service unavailable' })
      });
    });
    
    await page.click('[data-testid="chat-tab"]');
    await page.fill('[data-testid="chat-input"]', 'NYC to LAX December 25th');
    await page.click('[data-testid="send-button"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Search service unavailable');
  });
});