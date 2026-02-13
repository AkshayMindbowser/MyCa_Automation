(async () => {
  const LOGIN_URL = 'http://localhost:3000/login';
  const unregisteredEmail = 'akshay.test@user.com';
  const unregisteredPassword = 'Akshay@1234';

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

    console.log(`\nEntering unregistered user credentials:`);
    console.log(`  Email: ${unregisteredEmail}`);
    console.log(`  Password: ${unregisteredPassword}`);

    await emailInput.fill('');
    await emailInput.fill(unregisteredEmail);
    await pwdInput.fill('');
    await pwdInput.fill(unregisteredPassword);
    await page.waitForTimeout(400);

    console.log('\nClicking Login button...');
    await Promise.all([
      loginBtn.click().catch(() => {}),
      page.waitForTimeout(800)
    ]);

    // Wait and check for error messages or redirection
    await page.waitForTimeout(3000);

    // Check if redirected to dashboard (user would NOT be blocked)
    const currentUrl = page.url();
    const isDashboard = currentUrl.includes('/hospitals');

    if (isDashboard) {
      console.log('\n❌ TEST FAILED: Unregistered user was able to login and access dashboard.');
      console.log('   Current URL:', currentUrl);
      const screenshot = '327_UnregisteredUserLogin.failed.png';
      await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
      console.log('   Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    }

    // Look for error messages indicating user is blocked/unregistered
    const blockingMessages = [
      /Wrong email or password/i,
      /Invalid username or password/i,
      /Invalid credentials/i,
      /user not found/i,
      /not registered/i,
      /account does not exist/i,
      /Unable to sign in/i
    ];

    let blocked = false;
    let blockMessage = '';

    for (const pattern of blockingMessages) {
      try {
        const el = page.locator('text', { hasText: pattern }).first();
        await el.waitFor({ state: 'visible', timeout: 2000 });
        blocked = true;
        blockMessage = (await el.textContent()) || pattern.source;
        break;
      } catch (e) {
        // ignore
      }
    }

    // Fallback: check for role="alert"
    if (!blocked) {
      try {
        const alertEl = page.locator('[role="alert"]').first();
        await alertEl.waitFor({ state: 'visible', timeout: 1500 });
        blocked = true;
        blockMessage = (await alertEl.textContent()) || '';
      } catch (e) {}
    }

    // Fallback: check page text
    if (!blocked) {
      const bodyText = (await page.textContent('body')) || '';
      const match = bodyText.match(/(Wrong email or password|Invalid username or password|Invalid credentials|not registered|account does not exist|Unable to sign in)/i);
      if (match) {
        blocked = true;
        blockMessage = match[0];
      }
    }

    const screenshot = blocked ? '327_UnregisteredUserLogin.blocked.png' : '327_UnregisteredUserLogin.notblocked.png';
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

    console.log('\n=== Result ===');
    if (blocked) {
      console.log('✅ TEST PASSED: Unregistered user is blocked from logging in.');
      console.log('   Error message:', (blockMessage || '').trim());
      console.log('   Screenshot saved:', screenshot);
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ TEST FAILED: Unregistered user was NOT blocked (no error message detected).');
      console.log('   Current URL:', currentUrl);
      console.log('   Screenshot saved:', screenshot);
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
