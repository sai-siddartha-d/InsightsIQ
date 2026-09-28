import { test, expect } from '@playwright/test';

test.describe('Session Management', () => {

  test('@regression Verify access token stored', async ({ page }) => {

    await page.goto('/#/login');

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

    const storage =
      await page.evaluate(() => ({
        accessToken:
          localStorage.getItem('accessToken'),

        refreshToken:
          localStorage.getItem('refreshToken')
      }));

    console.log(storage);

    expect(storage.accessToken)
      .not.toBeNull();

    expect(storage.refreshToken)
      .not.toBeNull();
  });

});