import { test, expect } from '@playwright/test';

test.describe('Admin & Instructor Access (Hungarian)', () => {
  test('Unauthenticated user navigating to /admin is protected and redirected', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect to /login
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('Instructors page displays Hungarian team profiles and quality standards', async ({ page }) => {
    await page.goto('/instructors');

    await expect(page).toHaveTitle(/Oktatóink/i);
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toContainText('Ismerd Meg Oktatói Csapatunkat');

    // Quality highlights
    const whyUsHeading = page.getByRole('heading', { name: /Miért érdemes nálunk edzened\?/i });
    await expect(whyUsHeading).toBeVisible();
  });
});
