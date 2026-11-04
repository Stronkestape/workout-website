import { test, expect } from '@playwright/test';

test.describe('Cancellation Policy & Rules (Hungarian)', () => {
  test('Footer renders Hungarian cancellation policy summary', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer).toContainText('Lemondási Szabályzat');
    await expect(footer).toContainText('2 órával');
  });

  test('Unauthenticated user navigating to /bookings is protected and redirected', async ({ page }) => {
    await page.goto('/bookings');

    // Should redirect to /login
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});
