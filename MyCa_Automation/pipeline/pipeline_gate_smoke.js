#!/usr/bin/env node
const { chromium } = require('playwright');
const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://34.234.86.155:3000';
const LOGIN_URL = `${BASE_URL}/login`;
const DEFAULT_TIMEOUT = 30000;

// In CI, require credentials from environment; locally allow defaults
const EMAIL = process.env.TEST_EMAIL || (process.env.CI ? null : 'shrinath.himane@mindbowser.com');
const PASSWORD = process.env.TEST_PASSWORD || (process.env.CI ? null : 'Test@1234');

if (!EMAIL || !PASSWORD) {
  console.error('❌ TEST_EMAIL and TEST_PASSWORD environment variables are required in CI');
  process.exit(1);
}

// Global timeout to prevent infinite hangs
const SCRIPT_TIMEOUT = setTimeout(() => {
  console.error('❌ Script timeout exceeded');
  process.exit(2);
}, 120000);

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
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => resolve(res.statusCode === 200))
      .on('error', () => resolve(false));
  });
}

async function login(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });

  const sadminBtn = page.locator('button:has-text("Login as Super Admin")');
  if (await sadminBtn.count()) {
    await sadminBtn.click();
    await page.waitForLoadState('domcontentloaded');
  }

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  const submitBtn = page.locator('button[type="submit"]')
    .or(page.locator('button:has-text("Login")'))
    .or(page.locator('button:has-text("Continue")'));
  await submitBtn.first().click();
  await page.waitForLoadState('networkidle');
}

(async () => {
  console.log('\n🚦 PIPELINE GATE TESTS STARTED');

  assert(await checkUrl(LOGIN_URL), 'Login URL should be reachable');

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  const submitBtn = page.locator('button[type="submit"]')
    .or(page.locator('button:has-text("Login")'))
    .or(page.locator('button:has-text("Continue")'));

  const alertLocator = page.locator('[role="alert"]')
    .or(page.locator('text=invalid'))
    .or(page.locator('text=incorrect'));

  try {
    /* Login */
    await login(page);
    assert(!/login|auth0/i.test(page.url()), 'User should login successfully');

    /* Dashboard */
    const dashboardLocator = page.locator('text=Dashboard')
      .or(page.locator('text=Home'))
      .or(page.locator('[data-testid="dashboard"]'));
    const dashboardVisible = await dashboardLocator.first().isVisible({ timeout: DEFAULT_TIMEOUT }).catch(() => false);
    assert(dashboardVisible, 'Dashboard should be visible');

    /* Session persistence */
    await page.reload();
    assert(!/login|auth0/i.test(page.url()), 'Session should persist after refresh');

    /* Invalid email */
    await page.goto(LOGIN_URL, { timeout: DEFAULT_TIMEOUT });
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', '123456');
    await submitBtn.first().click();
    const invalidEmailError = await alertLocator.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    assert(invalidEmailError, 'Invalid email validation should appear');

    /* Incorrect password */
    await page.goto(LOGIN_URL, { timeout: DEFAULT_TIMEOUT });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', 'WrongPass123');
    await submitBtn.first().click();
    const incorrectPwError = await alertLocator.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    assert(incorrectPwError, 'Incorrect password error should appear');

    /* Password masking */
    const pwType = await page.locator('input[type="password"]').getAttribute('type');
    assert(pwType === 'password', 'Password field should be masked');

    /* Re-login before checking dashboard CTA */
    await login(page);

    /* Critical dashboard CTA */
    await page.goto(BASE_URL, { timeout: DEFAULT_TIMEOUT });
    const addHospitalVisible = await page.locator('text=Add Hospital').isVisible({ timeout: DEFAULT_TIMEOUT }).catch(() => false);
    assert(addHospitalVisible, 'Add Hospital button should be visible');

    /* Invalid route */
    await page.goto(`${BASE_URL}/invalid-${Date.now()}`, { timeout: DEFAULT_TIMEOUT });
    const notFoundLocator = page.locator('text=404').or(page.locator('text=Not Found'));
    const notFoundVisible = await notFoundLocator.first().isVisible({ timeout: DEFAULT_TIMEOUT }).catch(() => false);
    assert(notFoundVisible, 'Invalid URL should show 404 page');

  } catch (err) {
    console.error('❌ Unexpected error:', err.stack);
    failures++;
  } finally {
    clearTimeout(SCRIPT_TIMEOUT);
    await browser.close();

    console.log(`\nGate Failures: ${failures}`);
    process.exit(failures > 0 ? 1 : 0);
  }
})();
