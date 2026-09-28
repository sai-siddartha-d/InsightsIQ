import { test, expect } from '@playwright/test';

test.describe('InsightsIQ Login Functionality', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login');
  });

  // Smoke Test
  test('@smoke Login page loads correctly', async ({ page }) => {

    await expect(
      page.locator('input[type="email"]')
    ).toBeVisible();

    await expect(
      page.locator('input[type="password"]')
    ).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: /sign in/i
      })
    ).toBeVisible();
  });

  // Positive Test
  test('@smoke @regression Successful login', async ({ page }) => {

    await page.fill(
      'input[type="email"]',
      'demo@insightsiq.com'
    );

    await page.fill(
      'input[type="password"]',
      'demo123'
    );

    await page.getByRole('button', {
      name: /sign in/i
    }).click();

    await expect(page).toHaveURL(/#\/$/);
  });

  // Negative Test - Invalid Credentials
  test('@regression Login fails with invalid credentials', async ({ page }) => {

    await page.fill(
      'input[type="email"]',
      'wrong@test.com'
    );

    await page.fill(
      'input[type="password"]',
      'wrong123'
    );

    await page.getByRole('button', {
      name: /sign in/i
    }).click();

    await expect(page).toHaveURL(/#\/login$/);
  });

  // Negative Test - Empty Email
  test('@regression Login fails with empty email', async ({ page }) => {

    await page.fill(
      'input[type="password"]',
      'demo123'
    );

    await page.getByRole('button', {
      name: /sign in/i
    }).click();

    await expect(
      page.locator('input[type="email"]')
    ).toBeVisible();
  });

  // Negative Test - Empty Password
  test('@regression Login fails with empty password', async ({ page }) => {

    await page.fill(
      'input[type="email"]',
      'demo@insightsiq.com'
    );

    await page.getByRole('button', {
      name: /sign in/i
    }).click();

    await expect(
      page.locator('input[type="password"]')
    ).toBeVisible();
  });

  // Verify Token Stored After Login
  test('@regression Verify access token stored', async ({ page }) => {

  await page.fill(
    'input[type="email"]',
    'demo@insightsiq.com'
  );

  await page.fill(
    'input[type="password"]',
    'demo123'
  );

  await page.getByRole('button', {
    name: /sign in/i
  }).click();

  await expect(page).toHaveURL(/#\/$/);

  const token = await page.evaluate(() => {
    return localStorage.getItem('accessToken');
  });

  console.log('TOKEN:', token);

  expect(token).not.toBeNull();
});
});