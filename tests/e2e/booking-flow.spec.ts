import { test, expect } from '@playwright/test';

test.describe('Booking Flow & Navigation (Hungarian)', () => {
  test('Landing page renders Hungarian studio branding and navigation links', async ({ page }) => {
    await page.goto('/');

    // Check heading and studio branding
    await expect(page).toHaveTitle(/Mozgás Központ/i);
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toContainText('A Mozgás a Központban');

    // Check CTA button
    const calendarCta = page.getByRole('link', { name: /Órarend Megtekintése|Órarend & Helyfoglalás/i }).first();
    await expect(calendarCta).toBeVisible();

    // Check category section
    const formatsSection = page.locator('#workouts');
    await expect(formatsSection).toBeVisible();
    await expect(formatsSection).toContainText('Kínálatunk & Edzésformáink');
  });

  test('Calendar page loads schedule and allows filtering by category', async ({ page }) => {
    await page.goto('/calendar');

    // Calendar page title
    const heading = page.locator('h2').first();
    await expect(heading).toContainText('Csoportos Órarend & Foglalás');

    // Category filter bar
    const allButton = page.getByRole('button', { name: /Összes Edzés/i });
    await expect(allButton).toBeVisible();

    // Verify filter interaction
    const spinningFilter = page.getByRole('button', { name: /Spinning/i }).first();
    if (await spinningFilter.isVisible()) {
      await spinningFilter.click();
      await expect(spinningFilter).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('Login page offers 1-click Demo accounts with Hungarian role labels', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h2')).toContainText('Bejelentkezés');

    // Demo buttons
    const demoMemberBtn = page.getByRole('button', { name: /Demó Vendég/i });
    const demoInstructorBtn = page.getByRole('button', { name: /Demó Oktató/i });

    await expect(demoMemberBtn).toBeVisible();
    await expect(demoInstructorBtn).toBeVisible();
  });
});
