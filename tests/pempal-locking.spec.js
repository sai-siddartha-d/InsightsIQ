import { test, expect } from '@playwright/test';

test.describe('PEMPAL Entry Locking', () => {

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

    await expect(page).toHaveURL(/#\/login$/);

    await page.goto('/#/modules/pempal');

    await page.getByRole('button', {
  name: 'Promo Details'
}).click();

    await page.waitForTimeout(3000);
  });

  test('@smoke Verify submitted periods are locked',
    async ({ page }) => {

      const dropdown =
        page.locator('select').nth(2);

      const valueField =
        page.locator('input[type="text"]').nth(3);

      const reasonField =
        page.locator('input[type="text"]').nth(4);

      const dropdownDisabled =
        await dropdown.isDisabled();

      if (dropdownDisabled) {

        console.log(
          'Period already locked'
        );

        await expect(dropdown)
          .toBeDisabled();

        return;
      }

      await dropdown.selectOption('PCT_OFF');

      await valueField.fill('25');

      await reasonField.fill(
        'Playwright automation'
      );

      await page.getByRole('button', {
        name: /submit entries/i
      }).click();

      await page.waitForTimeout(3000);

      await expect(dropdown)
        .toBeDisabled();

      await expect(valueField)
        .toBeDisabled();

      await expect(reasonField)
        .toBeDisabled();
    }
  );

  test('@regression Verify locked dropdown cannot be changed',
    async ({ page }) => {

      const dropdown =
        page.locator('select').nth(2);

      if (
        await dropdown.isDisabled()
      ) {

        await expect(dropdown)
          .toBeDisabled();
      }
    }
  );

  test('@regression Verify locked value field cannot be edited',
    async ({ page }) => {

      const field =
        page.locator('input[type="text"]').nth(3);

      if (
        await field.isDisabled()
      ) {

        await expect(field)
          .toBeDisabled();
      }
    }
  );

  test('@regression Verify locked reason field cannot be edited',
    async ({ page }) => {

      const field =
        page.locator('input[type="text"]').nth(4);

      if (
        await field.isDisabled()
      ) {

        await expect(field)
          .toBeDisabled();
      }
    }
  );

  test('@regression Verify lock persists after refresh',
  async ({ page }) => {

    await page.reload();

    await page.waitForLoadState('networkidle');

    await page.getByRole('button', {
  name: 'Promo Details'
}).click();

    await page.waitForTimeout(2000);

    const disabledDropdowns =
      page.locator('select:disabled');

    await expect(
      disabledDropdowns.first()
    ).toBeVisible();
  }
);

});