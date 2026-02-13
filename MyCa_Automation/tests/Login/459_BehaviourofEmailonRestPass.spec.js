(async () => {
  const LOGIN_URL = 'http://localhost:3000/login';
  const registeredEmail = 'shrinath.himane@mindbowser.com';
  const unregisteredEmail = 'no.such.user@example.com';
  const invalidEmails = ['invalidemail', 'invalid@', '@domain.com', 'invalid email@domain.com'];

  let browser;
  try {
    const { chromium } = require('playwright');
    console.log('Launching Chromium (headful)...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to', LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Click "Login as Super Admin" to reach Auth0
    const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")');
    await loginAsAdminBtn.waitFor({ state: 'visible', timeout: 5000 });
    await loginAsAdminBtn.click();

    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch(e){ await page.waitForTimeout(2000); }

    // Click "Don't remember your password?" link
    const resetLink = page.locator('a.auth0-lock-alternative-link:has-text("Don\'t remember your password")');
    await resetLink.waitFor({ state: 'visible', timeout: 10000 });
    await resetLink.click();

    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }); } catch(e){ await page.waitForTimeout(1500); }

    // Locate email input on reset page and send button
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    // Button text may vary; try common options
    const sendBtn = page.locator('button:has-text("Send"), button:has-text("Send Email"), button:has-text("Reset"), button:has-text("Continue")').first();
    await sendBtn.waitFor({ state: 'visible', timeout: 5000 });

    console.log('\n=== Testing invalid email formats (should show format error) ===');
    let invalidPassed = 0;
    for (const e of invalidEmails) {
      console.log('\nTesting invalid input:', e);
      await emailInput.fill('');
      await emailInput.fill(e);
      await page.waitForTimeout(300);
      // Try submit
      await sendBtn.click({ timeout: 3000 });
      await page.waitForTimeout(800);

      // Detect format error messages
      let errorDetected = false;
      try {
        const errEl = page.locator('text=/email is invalid|invalid email|Please enter a valid email|Invalid/ i').first();
        await errEl.waitFor({ state: 'visible', timeout: 1200 });
        const txt = await errEl.textContent();
        console.log('Error message shown:', txt.trim());
        errorDetected = true;
      } catch (err) {
        // maybe HTML5 invalidity
        const valid = await emailInput.evaluate((el) => el.checkValidity());
        if (!valid) {
          console.log('HTML5 validation flagged input as invalid.');
          errorDetected = true;
        }
      }

      if (errorDetected) {
        console.log('=> OK (format error detected)');
        invalidPassed++;
      } else {
        console.log('=> FAIL (no format error shown)');
      }
    }

    console.log(`\nInvalid-format tests passed: ${invalidPassed}/${invalidEmails.length}`);

    console.log('\n=== Testing registered email (should show success/confirmation) ===');
    await emailInput.fill('');
    await emailInput.fill(registeredEmail);
    await page.waitForTimeout(300);
    await sendBtn.click();
    await page.waitForTimeout(1500);

    // Success pattern examples
    const successPatterns = [/check your email/i, /we(?:'|’)?ve sent/i, /we have sent/i, /email sent/i, /if an account exists/i];
    let regSuccess = false;
    try {
      const successEl = page.locator('text=/check your email|we\W*sent|email sent|if an account exists/i').first();
      await successEl.waitFor({ state: 'visible', timeout: 4000 });
      const txt = (await successEl.textContent()) || '';
      console.log('Success message detected:', txt.trim());
      regSuccess = true;
    } catch (err) {
      // fallback: inspect page for heading indicating next step
      const heading = await page.locator('h1, h2, [role="heading"]').first().textContent().catch(() => '');
      if (heading && /check|email|sent|reset/i.test(heading)) {
        console.log('Heading indicates success:', heading.trim());
        regSuccess = true;
      } else {
        console.log('No clear success message found for registered email.');
      }
    }

    console.log('\n=== Testing unregistered email (should show error) ===');
    await emailInput.fill('');
    await emailInput.fill(unregisteredEmail);
    await page.waitForTimeout(300);
    await sendBtn.click();
    await page.waitForTimeout(1500);

    let unregError = false;
    try {
      const errEl = page.locator('text=/no user|not found|does not exist|no account|could not find|not registered|User not found|Unknown user|error/i').first();
      await errEl.waitFor({ state: 'visible', timeout: 3000 });
      const txt = (await errEl.textContent()) || '';
      console.log('Unregistered error detected:', txt.trim());
      unregError = true;
    } catch (err) {
      console.log('No explicit unregistered error message detected.');
    }

    // Decide pass/fail according to user requirement: registered -> success; unregistered -> error
    console.log('\n=== Result Summary ===');
    console.log('Registered email success detected:', regSuccess ? 'YES' : 'NO');
    console.log('Unregistered email error detected:', unregError ? 'YES' : 'NO');

    if (invalidPassed === invalidEmails.length && regSuccess && unregError) {
      console.log('\n🎉 TEST PASSED: Email-reset flow behaves as expected.');
      await browser.close();
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED: One or more expectations did not meet criteria.');
      if (invalidPassed !== invalidEmails.length) console.log(`  Invalid-format checks passed ${invalidPassed}/${invalidEmails.length}`);
      if (!regSuccess) console.log('  Registered email did NOT show success message.');
      if (!unregError) console.log('  Unregistered email did NOT show error message.');
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('\nScript error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
