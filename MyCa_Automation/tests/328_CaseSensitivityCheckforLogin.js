(async () => {
  const LOGIN_URL = 'http://34.234.86.155:3000/login';
  // Original valid credentials
  const validEmail = 'shrinath.himane@mindbowser.com';
  const validPassword = 'Test@1234';

  // Three combinations: two expected to fail (case variations) and canonical valid last
  const testCases = [
    { email: 'SHRINATH.HIMANE@MINDBOWSER.COM', password: 'TEST@1234', description: 'All uppercase email and password (should fail)' },
    { email: 'shrinath.himane@mindbowser.com', password: 'TEST@1234', description: 'Correct email, uppercase password (should fail)' },
    { email: validEmail, password: validPassword, description: 'Canonical valid credentials (should succeed)' }
  ];

  const { chromium } = require('playwright');
  let browser;
  try {
    console.log('Launching Chromium (headful)...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    console.log('Navigating to', LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Click "Login as Super Admin" to reach Auth0
    const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await loginAsAdminBtn.waitFor({ state: 'visible', timeout: 10000 });
    await loginAsAdminBtn.click();
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) { await page.waitForTimeout(1500); }

    // Locate inputs and login button
    const emailInput = page.locator('input[type="email"]').first();
    const pwdInput = page.locator('input[type="password"]').first();
    const loginBtn = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();

    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await pwdInput.waitFor({ state: 'visible', timeout: 10000 });

    console.log('\n=== Testing Case Sensitivity ===\n');

    const results = [];
    // For reliability, begin each attempt from the main login page and click the Super Admin button
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      console.log(`Test ${i + 1}: ${tc.description}`);
      console.log(`  Email: ${tc.email}`);
      console.log(`  Password: ${tc.password}`);

      try {
        // Start fresh: navigate to login and click Super Admin to reach Auth0
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 20000 });
        const adminBtn = page.locator('button:has-text("Login as Super Admin")').first();
        await adminBtn.waitFor({ state: 'visible', timeout: 10000 });
        await adminBtn.click();
        // wait for auth0 fields
        await emailInput.waitFor({ state: 'visible', timeout: 15000 });
        await pwdInput.waitFor({ state: 'visible', timeout: 15000 });

        // Fill and submit
        await emailInput.fill('');
        await emailInput.fill(tc.email);
        await pwdInput.fill('');
        await pwdInput.fill(tc.password);
        await page.waitForTimeout(300);
        await loginBtn.click().catch(() => {});

        // Wait for possible redirect to dashboard
        try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }); } catch (e) { await page.waitForTimeout(1000); }

        const currentUrl = page.url();
        const isDashboard = currentUrl.includes('/hospitals');

        if (isDashboard) {
          console.log('  → ✅ Login SUCCEEDED - redirected to dashboard');
          results.push({ test: i + 1, description: tc.description, email: tc.email, password: tc.password, loginSucceeded: true, screenshot: `328_CaseSensitivityCheck.test${i + 1}.png` });
        } else {
          // look for error text
          let detected = false;
          let msg = '';
          try {
            const alert = page.locator('[role="alert"]').first();
            await alert.waitFor({ state: 'visible', timeout: 3000 });
            msg = (await alert.textContent()) || '';
            detected = true;
          } catch (e) {
            // fallback search
            const bodyText = (await page.textContent('body')) || '';
            const match = bodyText.match(/(Wrong email or password|Invalid username or password|Invalid credentials|not registered|Password can't be blank)/i);
            if (match) { detected = true; msg = match[0]; }
          }

          if (detected) console.log(`  → ❌ Login FAILED - ${msg.trim()}`);
          else console.log('  → ⚠️  Login FAILED - no dashboard, no clear error detected');

          results.push({ test: i + 1, description: tc.description, email: tc.email, password: tc.password, loginSucceeded: false, message: msg, screenshot: `328_CaseSensitivityCheck.test${i + 1}.png` });
        }

        // Save screenshot for each attempt
        try { await page.screenshot({ path: `328_CaseSensitivityCheck.test${i + 1}.png`, fullPage: true }); } catch (e) {}
      } catch (err) {
        console.log(`  → ⚠️  Test error: ${err.message}`);
        results.push({ test: i + 1, description: tc.description, email: tc.email, password: tc.password, loginSucceeded: false, error: err.message, screenshot: null });
      }

      // small delay between attempts
      await page.waitForTimeout(800);
    }

    console.log('\n=== Summary ===');
    let allPassed = true;
    for (const r of results) {
      const status = r.loginSucceeded ? '✅ PASS' : '❌ FAIL';
      console.log(`Test ${r.test}: ${status} - ${r.description}`);
      // We expect all case variations to succeed (case-insensitive) or all to fail (case-sensitive)
      // If email is case-insensitive, all should pass; if password is case-sensitive, tests with wrong case should fail
      // For now, log results and user can interpret
    }

    console.log('\nInterpretation:');
    const successCount = results.filter(r => r.loginSucceeded).length;
    if (successCount === testCases.length) {
      console.log('All case variations succeeded → Email and password are CASE-INSENSITIVE');
    } else if (successCount === 0) {
      console.log('All case variations failed → Case-sensitivity enforced (or other validation issue)');
    } else {
      console.log(`${successCount}/${testCases.length} case variations succeeded → Mixed results (check email vs password case-sensitivity)`);
    }

    // Now verify that valid credentials CAN login — this confirms that only exact valid credentials work.
    console.log('\nVerifying that canonical valid credentials still work...');
    try {
      // Return to login and reach Auth0
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 20000 });
      const adminBtn = page.locator('button:has-text("Login as Super Admin")').first();
      await adminBtn.waitFor({ state: 'visible', timeout: 8000 });
      await adminBtn.click();
      await page.waitForTimeout(1500);

      // fill valid creds
      await emailInput.waitFor({ state: 'visible', timeout: 8000 });
      await pwdInput.waitFor({ state: 'visible', timeout: 8000 });
      await emailInput.fill('');
      await emailInput.fill(validEmail);
      await pwdInput.fill('');
      await pwdInput.fill(validPassword);
      await page.waitForTimeout(300);

      await loginBtn.click().catch(() => {});
      // wait for possible redirect
      try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { await page.waitForTimeout(2000); }

      const finalUrl = page.url();
      const validLoginSucceeded = finalUrl.includes('/hospitals');

      if (successCount === 0 && validLoginSucceeded) {
        console.log('\n✅ TEST PASSED: No mixed-case variations could log in and canonical valid credentials succeed');
        const shot = '328_CaseSensitivityCheck.valid_login.png';
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
        console.log('Screenshot saved:', shot);
        await browser.close();
        process.exit(0);
      } else {
        console.log('\n❌ TEST FAILED: Either mixed-case variations logged in or valid credentials failed');
        console.log('  mixed-case successes:', successCount);
        console.log('  validLoginSucceeded:', validLoginSucceeded);
        const shot = '328_CaseSensitivityCheck.result.png';
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
        console.log('Screenshot saved:', shot);
        await browser.close();
        process.exit(1);
      }
    } catch (err) {
      console.log('Error while verifying valid credentials:', err && err.message ? err.message : err);
      await browser.close();
      process.exit(2);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
