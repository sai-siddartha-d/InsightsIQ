export class LoginPage {

  constructor(page) {
    this.page = page;

    this.emailInput =
      page.locator('input[type="email"]');

    this.passwordInput =
      page.locator('input[type="password"]');

    this.signInButton =
      page.getByRole('button', {
        name: /sign in/i
      });
  }

  async goto() {
    await this.page.goto('/#/login');
  }

  async login(email, password) {
    await this.emailInput.fill(email);

    await this.passwordInput.fill(password);

    await this.signInButton.click();
  }

  async isLoginPageVisible() {
    return await this.signInButton.isVisible();
  }
}