#!/usr/bin/env node
const { chromium } = require('playwright');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://34.234.86.155:3000';
const LOGIN_URL = `${BASE_URL}/login`;
const EMAIL = process.env.TEST_EMAIL || 'shrinath.himane@mindbowser.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Test@1234';

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => resolve(res.statusCode === 200))
      .on('error', () => resolve(false));
  });
}

async function login(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

  const sadminBtn = page.locator('button:has-text("Login as Super Admin")');
  if (await sadminBtn.count()) {
    await sadminBtn.click();
    await page.waitForLoadState('domcontentloaded');
  }

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Continue")');
  await page.waitForLoadState('networkidle');
}

(async () => {
  console.log('\n🚦 PIPELINE GATE TESTS STARTED');

  assert(await checkUrl(LOGIN_URL), 'Login URL should be reachable');

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  try {
    /* Login */
    await login(page);
    assert(!/login|auth0/i.test(page.url()), 'User should login successfully');

    /* Dashboard */
    const dashboardVisible =
      await page.locator('text=Dashboard, text=Home, [data-testid="dashboard"]').count() > 0;
    assert(dashboardVisible, 'Dashboard should be visible');

    /* Session persistence */
    await page.reload();
    assert(!/login|auth0/i.test(page.url()), 'Session should persist after refresh');

    /* Invalid email */
    await page.goto(LOGIN_URL);
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Continue")');
    assert(
      await page.locator('[role="alert"], text=invalid').count() > 0,
      'Invalid email validation should appear'
    );

    /* Incorrect password */
    await page.goto(LOGIN_URL);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', 'WrongPass123');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Continue")');
    assert(
      await page.locator('[role="alert"], text=incorrect').count() > 0,
      'Incorrect password error should appear'
    );

    /* Password masking */
    const pwType = await page.locator('input[type="password"]').getAttribute('type');
    assert(pwType === 'password', 'Password field should be masked');

    /* Critical dashboard CTA */
    await page.goto(BASE_URL);
    assert(
      await page.locator('text=Add Hospital').count() > 0,
      'Add Hospital button should be visible'
    );

    /* Invalid route */
    await page.goto(`${BASE_URL}/invalid-${Date.now()}`);
    assert(
      await page.locator('text=404, text=Not Found').count() > 0,
      'Invalid URL should show 404 page'
    );

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    failures++;
  } finally {
    await browser.close();

    console.log(`\nGate Failures: ${failures}`);
    process.exit(failures > 0 ? 1 : 0);
  }
})();
