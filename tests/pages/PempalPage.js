import { expect } from '@playwright/test';

export class PempalPage {

  constructor(page) {
    this.page = page;

    this.heading =
      page.getByRole('heading', {
        name: 'PEMPAL'
      });
  }

  async goto() {
    await this.page.goto('/#/modules/pempal');
  }

  async verifyLoaded() {
    await expect(this.heading)
      .toBeVisible();
  }
}