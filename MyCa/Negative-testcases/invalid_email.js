const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    await page.goto('http://34.234.86.155:3000/login');
    await page.waitForLoadState('networkidle');

    // Click Login as Super Admin
    await page.waitForSelector('text=Login as Super Admin', { state: 'visible' });
    await page.click('text=Login as Super Admin');

    // Click Don't remember password link
    const forgotSelector = 'xpath=//a[@class="auth0-lock-alternative-link"]';
    const forgotLink = page.locator(forgotSelector);
    await forgotLink.waitFor({ state: 'visible', timeout: 10000 });
    await forgotLink.click({ timeout: 10000 });

    // Enter invalid email and click Send email
    await page.waitForSelector('xpath=//input[@id="1-email"]', { state: 'visible' });
    await page.fill('xpath=//input[@id="1-email"]', 'akshay@gmail.com');
    await page.waitForTimeout(1000);
    await page.click('text=Send email');

    // After clicking Send email, determine whether an error is shown or a reset link was sent.
    await page.waitForTimeout(2000);
    const bodyText = (await page.content()).toLowerCase();

    const errorPresent = bodyText.includes('inavlid email') || bodyText.includes('invalid email');
    const successLike = bodyText.includes('we sent') || bodyText.includes('check your email') || bodyText.includes('email has been sent') || bodyText.includes('reset link') || bodyText.includes('we have sent') || bodyText.includes('if an account');

    if (errorPresent) {
      console.log('Error message displayed: Inavlid email id');
    } else if (successLike) {
      // If the app proceeded to send a reset link for an unregistered email, that's a failure
      console.error('Script failed because user is not registered');
    } else {
      // Neither explicit error nor obvious success text found — save debug artifacts and fail
      try {
        const ss = 'invalid_email_debug.png';
        await page.screenshot({ path: ss, fullPage: true });
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('invalid_email_debug.html', html);
        console.error('Script failed: expected error not displayed. Saved debug files:', ss, 'invalid_email_debug.html');
      } catch (dumpErr) {
        console.error('Script failed and failed to save debug artifacts:', dumpErr);
      }
    }

    await browser.close();
  } catch (err) {
    console.error('Script failed:', err);
  }
})();
