import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';

test.describe('Landing Page', () => {

  test('@smoke Landing page loads', async ({ page }) => {

    const loginPage = new LoginPage(page);

    await loginPage.goto();

    await loginPage.login(
      'demo@insightsiq.com',
      'demo123'
    );

    await expect(page).toHaveURL(/#\/$/);

    await expect(
      page.locator('body')
    ).toBeVisible();
  });

});