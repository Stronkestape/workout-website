import { test, expect } from '@playwright/test';

test.describe('Auth Flow & Security (Hungarian)', () => {
  test('Registration page renders Hungarian fields and password requirements', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('h2')).toContainText('Fiók Létrehozása');

    // Field labels
    await expect(page.getByLabel('E-mail cím')).toBeVisible();
    await expect(page.getByLabel('Felhasználónév')).toBeVisible();
    await expect(page.getByLabel('Jelszó')).toBeVisible();

    // Submit button
    const submitBtn = page.getByRole('button', { name: /Regisztráció/i });
    await expect(submitBtn).toBeVisible();

    // Link to login
    const loginLink = page.getByRole('link', { name: /Jelentkezz be/i });
    await expect(loginLink).toBeVisible();
  });

  test('Unauthenticated user navigating to /profile is protected and redirected', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to /login
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('Navbar displays Hungarian public links when unauthenticated', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav');
    await expect(nav).toContainText('Órarend');
    await expect(nav).toContainText('Oktatóink');
    await expect(nav).toContainText('Bejelentkezés');
  });
});
