import { test, expect } from '@playwright/test';

import { LoginPage } from './pages/LoginPage.js';
import { USERS } from './test-data/users.js';

test.describe('PEMPAL Module', () => {

  test('@smoke Open PEMPAL', async ({ page }) => {

    const loginPage = new LoginPage(page);

    await loginPage.goto();

    await loginPage.login(
      USERS.demo.email,
      USERS.demo.password
    );

    await expect(page).toHaveURL(/#\/$/);

    await page.goto('/#/modules/pempal');

    console.log('Current URL:', page.url());

    // await page.pause(); // Opens Playwright Inspector
  });

});