import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {

  test('@smoke Redirect PEMPAL without login', async ({ page }) => {

    await page.goto('/#/modules/pempal');

    await expect(page).toHaveURL(/#\/login$/);
  });

  test('@smoke Redirect Krypton without login', async ({ page }) => {

    await page.goto('/#/modules/krypton');

    await expect(page).toHaveURL(/#\/login$/);
  });

  test('@smoke Redirect Simple Suite without login', async ({ page }) => {

    await page.goto('/#/modules/simple-suite');

    await expect(page).toHaveURL(/#\/login$/);
  });

  test('@regression Redirect root page without login', async ({ page }) => {

    await page.goto('/#/');

    await expect(page).toHaveURL(/#\/login$/);
  });

});