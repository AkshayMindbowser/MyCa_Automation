(async () => {
  const LOGIN_URL = 'http://34.234.86.155:3000/login';
  const validEmail = 'shrinath.himane@mindbowser.com';
  const invalidEmails = ['invalidemail', 'invalid@', '@domain.com', 'invalid email@domain.com'];

  const { chromium } = require('playwright');
  let browser;
  try {
    console.log('Launching Chromium (headful)...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to', LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Click "Login as Super Admin" to reach Auth0
    const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await loginAsAdminBtn.waitFor({ state: 'visible', timeout: 10000 });
    await loginAsAdminBtn.click();
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch(e) { await page.waitForTimeout(1500); }

    // Locate inputs and login button
    const emailInput = page.locator('input[type="email"]').first();
    const pwdInput = page.locator('input[type="password"]').first();
    const loginBtn = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();

    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await pwdInput.waitFor({ state: 'visible', timeout: 10000 });

    console.log('\n=== Part 1: Invalid email formats (should show format error) ===');
    let invalidPassed = 0;
    for (const e of invalidEmails) {
      console.log('\nTesting invalid email:', e);
      await emailInput.fill('');
      await emailInput.fill(e);
      await pwdInput.fill('');
      await page.waitForTimeout(300);

      // Try clicking login to trigger any client-side validation
      try { await loginBtn.click({ timeout: 3000 }); } catch (err) {}
      await page.waitForTimeout(600);

      // First check HTML5 validity
      const valid = await emailInput.evaluate((el) => el.checkValidity()).catch(() => true);
      if (!valid) {
        console.log('HTML5 validation: invalid email format detected. => OK');
        invalidPassed++;
        continue;
      }

      // Fallback: look for visible messages indicating invalid email format
      const errEl = page.locator('text=/email is invalid|invalid email|Please enter a valid email|Invalid/ i').first();
      try {
        await errEl.waitFor({ state: 'visible', timeout: 1200 });
        const txt = (await errEl.textContent()) || '';
        console.log('Error message shown:', txt.trim());
        console.log('=> OK');
        invalidPassed++;
        continue;
      } catch (err) {
        console.log('No explicit format error detected for this input.');
      }

      console.log('=> FAIL (no format error detected)');
    }

    console.log(`\nInvalid-format tests passed: ${invalidPassed}/${invalidEmails.length}`);

    console.log('\n=== Part 2: Enter only email and click Login (valid email) ===');
    await emailInput.fill('');
    await emailInput.fill(validEmail);
    await pwdInput.fill('');
    await page.waitForTimeout(300);

    console.log('Clicking Login with only email filled...');
    try { await loginBtn.click({ timeout: 3000 }); } catch (err) {}
    await page.waitForTimeout(1000);

    // Look for messages about missing password or other errors
    const missingPwdEl = page.locator('text=/Password can\'t be blank|Please enter your password|password.*required|Missing password/i').first();
    let missingPwdDetected = false;
    try {
      await missingPwdEl.waitFor({ state: 'visible', timeout: 3000 });
      const t = (await missingPwdEl.textContent()) || '';
      console.log('Missing-password message detected:', t.trim());
      missingPwdDetected = true;
    } catch (err) {
      console.log('No explicit missing-password message detected.');
    }

    // Final results
    console.log('\n=== Result Summary ===');
    console.log('Invalid-format checks passed:', invalidPassed, '/', invalidEmails.length);
    console.log('Submitting only email produced missing-password message:', missingPwdDetected ? 'YES' : 'NO');

    const allPassed = (invalidPassed === invalidEmails.length) && missingPwdDetected;
    if (allPassed) {
      console.log('\n🎉 TEST PASSED: Email validation and single-email submit behave as expected.');
      await browser.close();
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED: Some expectations not met.');
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
