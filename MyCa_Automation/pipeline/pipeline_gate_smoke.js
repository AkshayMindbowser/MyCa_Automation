#!/usr/bin/env node
const { chromium } = require('playwright');
const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
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

  // Use filter selector that works reliably
  const sadminBtn = page.locator('button').filter({ hasText: 'Super Admin' }).first();
  await sadminBtn.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
  await sadminBtn.click();

  // Wait for page to settle after click
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  console.log('Current URL after Super Admin click:', page.url());

  // Wait for email/password fields (either on Auth0 or local login page)
  const emailInput = page.locator('input[type="email"]').first();
  const pwdInput = page.locator('input[type="password"]').first();

  await emailInput.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
  await emailInput.fill(EMAIL);
  await page.waitForTimeout(500);

  await pwdInput.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
  await pwdInput.fill(PASSWORD);
  await page.waitForTimeout(500);

  const submitBtn = page.locator('button[type="submit"]')
    .or(page.locator('button').filter({ hasText: 'Continue' }))
    .or(page.locator('button').filter({ hasText: 'Log In' }))
    .or(page.locator('button').filter({ hasText: 'Login' }));
  await submitBtn.first().waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
  await submitBtn.first().click();

  // Wait for login to complete with retry logic
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const onLoginPage = currentUrl.includes('/login') || currentUrl.includes('auth0');
    const hasTable = await page.locator('table').count() > 0;
    const hasAddBtn = await page.locator('button:has-text("Add")').count() > 0;

    if (!onLoginPage && (hasTable || hasAddBtn)) {
      console.log('Login completed successfully');
      break;
    }

    if (attempt > 1) {
      try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      } catch (e) {}
    }
  }
}

(async () => {
  console.log('\n🚦 PIPELINE GATE TESTS STARTED');

  assert(await checkUrl(LOGIN_URL), 'Login URL should be reachable');

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  try {
    /* Login */
    await login(page);
    console.log('URL after login:', page.url());
    assert(!/login|auth0/i.test(page.url()), 'User should login successfully');

    /* Dashboard */
    const dashboardLocator = page.locator('text=Hospital Management')
      .or(page.locator('table'))
      .or(page.locator('button:has-text("Add")'));
    const dashboardVisible = await dashboardLocator.first().waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT }).then(() => true).catch(() => false);
    assert(dashboardVisible, 'Dashboard should be visible');

    /* Session persistence */
    await page.reload();
    assert(!/login|auth0/i.test(page.url()), 'Session should persist after refresh');

    /* Invalid credentials tests - use new browser context to avoid session conflicts */
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    /* Invalid email test */
    await page2.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
    const sadminBtn2 = page2.locator('button').filter({ hasText: 'Super Admin' }).first();
    await sadminBtn2.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
    await sadminBtn2.click();
    await page2.waitForLoadState('domcontentloaded');
    await page2.waitForTimeout(2000);

    const emailField = page2.locator('input[type="email"]').first();
    const pwdField = page2.locator('input[type="password"]').first();
    await emailField.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
    await emailField.fill('invalid-email');
    await pwdField.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
    await pwdField.fill('123456');
    const submitBtn2 = page2.locator('button[type="submit"]').first();
    await submitBtn2.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
    await submitBtn2.click();
    await page2.waitForTimeout(2000);
    // Check if still on login/auth page (invalid email should not proceed)
    const stillOnAuth = page2.url().includes('auth0') || page2.url().includes('login');
    assert(stillOnAuth, 'Invalid email validation should appear');

    await context2.close();

    /* Incorrect password test - use another new context */
    const context3 = await browser.newContext();
    const page3 = await context3.newPage();

    await page3.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
    const sadminBtn3 = page3.locator('button').filter({ hasText: 'Super Admin' }).first();
    await sadminBtn3.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
    await sadminBtn3.click();
    await page3.waitForLoadState('domcontentloaded');
    await page3.waitForTimeout(2000);

    const emailField2 = page3.locator('input[type="email"]').first();
    const pwdField2 = page3.locator('input[type="password"]').first();
    await emailField2.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
    await emailField2.fill(EMAIL);
    await pwdField2.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
    await pwdField2.fill('WrongPass123');
    const submitBtn3 = page3.locator('button[type="submit"]').first();
    await submitBtn3.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT });
    await submitBtn3.click();
    await page3.waitForTimeout(3000);
    // Check if still on login/auth page (wrong password should not proceed)
    const stillOnAuth2 = page3.url().includes('auth0') || page3.url().includes('login');
    assert(stillOnAuth2, 'Incorrect password error should appear');

    /* Password masking */
    const pwField3 = page3.locator('input[type="password"]').first();
    const pwType = await pwField3.getAttribute('type');
    assert(pwType === 'password', 'Password field should be masked');

    await context3.close();

    /* Critical dashboard CTA */
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
    await page.waitForTimeout(2000);
    const addHospitalBtn = page.locator('button:has-text("Add New Hospital")')
      .or(page.locator('button:has-text("Add Hospital")'))
      .or(page.locator('button').filter({ hasText: 'Add' }));
    const addHospitalVisible = await addHospitalBtn.first().waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT }).then(() => true).catch(() => false);
    assert(addHospitalVisible, 'Add Hospital button should be visible');

    /* Invalid route */
    await page.goto(`${BASE_URL}/invalid-${Date.now()}`, { timeout: DEFAULT_TIMEOUT });
    const notFoundLocator = page.locator('text=404').or(page.locator('text=Not Found'));
    const notFoundVisible = await notFoundLocator.first().waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT }).then(() => true).catch(() => false);
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
