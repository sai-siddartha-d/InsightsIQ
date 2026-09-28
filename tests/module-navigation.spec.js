import { test, expect } from '@playwright/test';

test.describe('Module Navigation', () => {

  test.beforeEach(async ({ page }) => {

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
  });

  // ======================
  // SMOKE TESTS
  // ======================

  test('@smoke Open PEMPAL', async ({ page }) => {

    await page.goto('/#/modules/pempal');

    await expect(page)
      .toHaveURL(/modules\/pempal/);
  });

  test('@smoke Open Krypton', async ({ page }) => {

    await page.goto('/#/modules/krypton');

    await expect(page)
      .toHaveURL(/modules\/krypton/);
  });

  test('@smoke Open Simple Suite', async ({ page }) => {

    await page.goto('/#/modules/simple-suite');

    await expect(page)
      .toHaveURL(/modules\/simple-suite/);
  });

  // ======================
  // REGRESSION TESTS
  // ======================

  test('@regression Navigate between all modules', async ({ page }) => {

    await page.goto('/#/modules/pempal');
    await expect(page).toHaveURL(/pempal/);

    await page.goto('/#/modules/krypton');
    await expect(page).toHaveURL(/krypton/);

    await page.goto('/#/modules/simple-suite');
    await expect(page).toHaveURL(/simple-suite/);

    await page.goto('/#/');
    await expect(page).toHaveURL(/#\/$/);
  });


  test('@regression Refresh page inside Krypton', async ({ page }) => {

    await page.goto('/#/modules/krypton');

    await page.reload();

    await expect(page)
      .toHaveURL(/modules\/krypton/);
  });

  test('@regression Browser back navigation', async ({ page }) => {

    await page.goto('/#/modules/pempal');

    await page.goto('/#/modules/krypton');

    await page.goBack();

    await expect(page)
      .toHaveURL(/modules\/pempal/);
  });

  test('@regression Browser forward navigation', async ({ page }) => {

  await page.goto('/#/modules/pempal');

  await expect(page)
    .toHaveURL(/modules\/pempal/);

  await page.goto('/#/modules/krypton');

  await expect(page)
    .toHaveURL(/modules\/krypton/);

  await page.goBack();

  await expect(page)
    .toHaveURL(/modules\/pempal/);

  await page.goForward({ waitUntil: 'domcontentloaded' });

  await expect(page)
    .toHaveURL(/modules\/krypton/);
});

  test('@regression Verify direct URL access', async ({ page }) => {

    await page.goto('/#/modules/pempal');

    await expect(page)
      .toHaveURL(/modules\/pempal/);

    await page.goto('/#/modules/krypton');

    await expect(page)
      .toHaveURL(/modules\/krypton/);

    await page.goto('/#/modules/simple-suite');

    await expect(page)
      .toHaveURL(/modules\/simple-suite/);
  });

});