(async () => {
  const LOGIN_URL = 'http://localhost:3000/login';
  const wrongPasswords = ['WrongPass123!', 'AnotherWrong2$', '12345wrong', 'Pass!@#wrong'];

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

    console.log('Testing multiple incorrect passwords with email LEFT BLANK...');

    const errorPatterns = [
      /Wrong email or password/i,
      /Invalid username or password/i,
      /Invalid email or password/i,
      /email or password is incorrect/i,
      /Invalid credentials/i,
      /Unable to sign in/i,
      /too many attempts/i,
      /Password can't be blank/i
    ];

    const results = [];
    for (let i = 0; i < wrongPasswords.length; i++) {
      const pw = wrongPasswords[i];
      console.log(`\nAttempt ${i + 1}: trying password: ${pw}`);

      await emailInput.fill(''); // explicitly leave email blank
      await pwdInput.fill('');
      await pwdInput.fill(pw);
      await page.waitForTimeout(400);

      await Promise.all([
        loginBtn.click().catch(() => {}),
        page.waitForTimeout(700)
      ]);

      let found = false;
      let foundText = '';

      // check patterns
      for (const pattern of errorPatterns) {
        try {
          const el = page.locator('text', { hasText: pattern }).first();
          await el.waitFor({ state: 'visible', timeout: 1500 });
          found = true;
          foundText = (await el.textContent()) || pattern.source;
          break;
        } catch (e) {
          // ignore
        }
      }

      // fallback role=alert
      if (!found) {
        try {
          const alertEl = page.locator('[role="alert"]', { hasText: /password|email|invalid|incorrect|failed/i }).first();
          await alertEl.waitFor({ state: 'visible', timeout: 1200 });
          found = true;
          foundText = (await alertEl.textContent()) || '';
        } catch (e) {}
      }

      // page text fallback
      if (!found) {
        const bodyText = (await page.textContent('body')) || '';
        const match = bodyText.match(/(Wrong email or password|Invalid username or password|Invalid credentials|Incorrect username or password|email or password is incorrect|Invalid email or password|Password can't be blank)/i);
        if (match) {
          found = true;
          foundText = match[0];
        }
      }

      const shot = `324_IncorrectPasswrd.attempt${i + 1}.png`;
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});

      if (found) {
        console.log('  → Error detected:', (foundText || '').trim());
      } else {
        console.log('  → No clear error message detected.');
      }
      results.push({ attempt: i + 1, password: pw, detected: found, message: foundText.trim(), screenshot: shot });
    }

    console.log('\n=== Summary ===');
    for (const r of results) {
      console.log(`Attempt ${r.attempt}: password='${r.password}' → errorDetected=${r.detected} screenshot=${r.screenshot}`);
    }

    await browser.close();
    // exit 0 regardless — this is observational; change if you want strict pass/fail
    process.exit(0);

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
