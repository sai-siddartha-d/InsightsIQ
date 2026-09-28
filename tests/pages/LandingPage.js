import { expect } from '@playwright/test';

export class LandingPage {

  constructor(page) {
    this.page = page;
  }

  async verifyLoaded() {
    await expect(this.page)
      .toHaveURL(/#\/$/);
  }
}