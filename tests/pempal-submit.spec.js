import { test, expect } from '@playwright/test';

test.describe('PEMPAL Submit Entries', () => {

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

    await page.waitForTimeout(2000);

    await page.getByText('Promo Details').click();

    await page.waitForTimeout(3000);
  });

  // test('@debug Print all dropdowns', async ({ page }) => {

  //   const selects = page.locator('select');

  //   const count = await selects.count();

  //   console.log('\n');
  //   console.log('========================');
  //   console.log('TOTAL SELECTS:', count);
  //   console.log('========================');

  //   for (let i = 0; i < count; i++) {

  //     const options = await selects
  //       .nth(i)
  //       .locator('option')
  //       .allTextContents();

  //     console.log(`SELECT ${i}`);
  //     console.log(options);
  //     console.log('----------------');
  //   }
  // });

  // test('@debug Print all inputs', async ({ page }) => {

  //   const inputs = page.locator('input');

  //   const count = await inputs.count();

  //   console.log('\n');
  //   console.log('========================');
  //   console.log('TOTAL INPUTS:', count);
  //   console.log('========================');

  //   for (let i = 0; i < count; i++) {

  //     const type = await inputs
  //       .nth(i)
  //       .getAttribute('type');

  //     const value = await inputs
  //       .nth(i)
  //       .inputValue()
  //       .catch(() => '');

  //     console.log(
  //       `INPUT ${i} | TYPE=${type} | VALUE=${value}`
  //     );
  //   }
  // });

  // test('@debug Verify submit button exists', async ({ page }) => {

  //   const submitButton = page.getByRole('button', {
  //     name: /submit entries/i
  //   });

  //   await expect(
  //     submitButton
  //   ).toBeVisible();

  //   console.log('Submit button found');
  // });

});