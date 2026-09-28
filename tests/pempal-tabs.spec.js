import { test, expect } from '@playwright/test';

test.describe('PEMPAL Tabs', () => {

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

    await page.goto('/#/modules/pempal');
  });

  test('@smoke Verify all tabs visible', async ({ page }) => {

    const tabs = [
      'Summary',
      'Promo Details',
      'Audit',
      'Marketed Rollup',
      'Fiscal Time',
      'Hierarchy',
      'Season Code'
    ];

    for (const tab of tabs) {
      await expect(
        page.getByText(tab, {
          exact: true
        }).first()
      ).toBeVisible();
    }
  });

  test('@regression Click all tabs', async ({ page }) => {

    const tabs = [
      'Summary',
      'Promo Details',
      'Audit',
      'Marketed Rollup',
      'Fiscal Time',
      'Hierarchy',
      'Season Code'
    ];

    for (const tab of tabs) {

      await page
        .getByText(tab, {
          exact: true
        })
        .first()
        .click();

      await page.waitForTimeout(1000);
    }
  });

});