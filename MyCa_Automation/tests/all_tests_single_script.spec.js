#!/usr/bin/env node
const { chromium } = require('playwright');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://34.234.86.155:3000';
const LOGIN_URL = `${BASE_URL}/login`;
const validEmail = process.env.TEST_EMAIL || 'shrinath.himane@mindbowser.com';
const validPassword = process.env.TEST_PASSWORD || 'Test@1234';

function checkUrl(u, timeout = 10000) {
  return new Promise((resolve) => {
    const req = http.get(u, (res) => resolve(res.statusCode === 200));
    req.on('error', () => resolve(false));
    req.setTimeout(timeout, () => { req.abort(); resolve(false); });
  });
}

async function loginIfNeeded(page) {
  // If current page is not a login/auth page, assume already authenticated
  const cur = page.url();
  if (!/login|auth0/i.test(cur)) return true;

  const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")');
  if (await loginAsAdminBtn.count()) {
    await loginAsAdminBtn.click().catch(() => {});
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }); } catch {}
  }

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitBtn = page.locator('button:has-text("Continue"), button:has-text("Login"), button[type="submit"]').first();

  if (await emailInput.count() && await passwordInput.count()) {
    await emailInput.fill(validEmail);
    await passwordInput.fill(validPassword);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(()=>{}),
      submitBtn.click().catch(()=>{}),
    ]);
    return !/auth0|login/i.test(page.url());
  }
  return false;
}

async function runAll() {
  console.log('Consolidated test run — single script for all scenarios');

  console.log('\n[1] URL reachability');
  const reachable = await checkUrl(LOGIN_URL);
  console.log(`  ${LOGIN_URL} reachable: ${reachable ? '✅' : '❌'}`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('\n[2] Login flow (performed once)');
    const loggedIn = await loginIfNeeded(page);
    console.log(`  Logged in: ${loggedIn ? '✅' : '❌'}`);

    console.log('\n[3] Scenarios (reusing authenticated session where applicable)');

    // Scenario: Login with valid credentials (verify dashboard visible)
    console.log('  - Verify dashboard visible after login');
    try {
      const dashboardSelectors = ['text=Dashboard', 'text=Home', '[data-testid="dashboard"]'];
      let found = false;
      for (const sel of dashboardSelectors) {
        if (await page.locator(sel).count()) { found = true; break; }
      }
      console.log(`    Dashboard visible: ${found ? '✅' : '❌'}`);
    } catch (e) { console.log('    Error checking dashboard:', e.message || e); }

    // Scenario: Invalid email format
    console.log('  - Invalid email format check (on Auth0 if present)');
    try {
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
      const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")');
      if (await loginAsAdminBtn.count()) { await loginAsAdminBtn.click().catch(()=>{}); try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }); } catch {} }
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitBtn = page.locator('button:has-text("Continue"), button:has-text("Login"), button[type="submit"]').first();
      if (await emailInput.count()) {
        await emailInput.fill('invalid-email');
        if (await passwordInput.count()) await passwordInput.fill('whatever');
        await submitBtn.click().catch(()=>{});
        // check for validation messages
        const err = await page.locator('text=invalid|text=Invalid|[role="alert"]').first().count();
        console.log(`    Invalid email validation shown: ${err ? '✅' : '❌'}`);
      } else console.log('    Email input not found — skipped');
    } catch (e) { console.log('    Error:', e.message || e); }

    // Scenario: Incorrect password
    console.log('  - Incorrect password check');
    try {
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
      const loginAsAdminBtn2 = page.locator('button:has-text("Login as Super Admin")');
      if (await loginAsAdminBtn2.count()) { await loginAsAdminBtn2.click().catch(()=>{}); try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }); } catch {} }
      const emailInput2 = page.locator('input[type="email"]');
      const passwordInput2 = page.locator('input[type="password"]');
      const submitBtn2 = page.locator('button:has-text("Continue"), button:has-text("Login"), button[type="submit"]').first();
      if (await emailInput2.count() && await passwordInput2.count()) {
        await emailInput2.fill(validEmail);
        await passwordInput2.fill('WrongPassword123');
        await submitBtn2.click().catch(()=>{});
        const authErr = await page.locator('text=Incorrect|text=invalid|[role="alert"]').first().count();
        console.log(`    Incorrect password error shown: ${authErr ? '✅' : '❌'}`);
      } else console.log('    Required inputs not found — skipped');
    } catch (e) { console.log('    Error:', e.message || e); }

    // Scenario: Unregistered user
    console.log('  - Unregistered user login attempt');
    try {
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
      const loginBtn3 = page.locator('button:has-text("Login as Super Admin")');
      if (await loginBtn3.count()) { await loginBtn3.click().catch(()=>{}); try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }); } catch {} }
      const email3 = page.locator('input[type="email"]');
      const pass3 = page.locator('input[type="password"]');
      const submit3 = page.locator('button:has-text("Continue"), button:has-text("Login"), button[type="submit"]').first();
      if (await email3.count() && await pass3.count()) {
        await email3.fill(`noone${Date.now()}@example.com`);
        await pass3.fill('SomePass123!');
        await submit3.click().catch(()=>{});
        const regErr = await page.locator('text=not found|text=No user|[role="alert"]').first().count();
        console.log(`    Unregistered user error shown: ${regErr ? '✅' : '❌'}`);
      }
    } catch (e) { console.log('    Error:', e.message || e); }

    // Scenario: Password field behavior (masked)
    console.log('  - Password field type check');
    try {
      const pw = page.locator('input[type="password"]');
      if (await pw.count()) console.log('    Password field present and masked: ✅'); else console.log('    Password field not found: ❌');
    } catch (e) { console.log('    Error:', e.message || e); }

    // Scenario: Dashboard elements and status toggle (if present)
    console.log('  - Dashboard and status toggle checks');
    try {
      // assume already logged-in state; navigate to base
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const statusToggle = page.locator('button:has-text("Active") , [data-testid="status-toggle"]');
      const addHosp = page.locator('button:has-text("Add Hospital") , text=Add Hospital');
      console.log(`    Status toggle present: ${await statusToggle.count() ? '✅' : '❌'}`);
      console.log(`    Add Hospital button present: ${await addHosp.count() ? '✅' : '❌'}`);
    } catch (e) { console.log('    Error:', e.message || e); }

    // Scenario: Case-sensitivity check for email
    console.log('  - Case sensitivity check for login email');
    try {
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
      const loginBtnCs = page.locator('button:has-text("Login as Super Admin")');
      if (await loginBtnCs.count()) { await loginBtnCs.click().catch(()=>{}); try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }); } catch {} }
      const emailCs = page.locator('input[type="email"]');
      const passCs = page.locator('input[type="password"]');
      const submitCs = page.locator('button:has-text("Continue"), button:has-text("Login"), button[type="submit"]').first();
      if (await emailCs.count() && await passCs.count()) {
        await emailCs.fill(validEmail.toUpperCase());
        await passCs.fill(validPassword);
        await submitCs.click().catch(()=>{});
        await page.waitForTimeout(1500);
        const post = page.url();
        const csSuccess = !/auth0|login/i.test(post);
        console.log(`    Uppercase-email login allowed: ${csSuccess ? '✅' : '❌'}`);
      } else console.log('    Inputs not found — skipped');
    } catch (e) { console.log('    Error:', e.message || e); }

    // --- Additional merged scenarios from remaining test files ---
    console.log('\n[4] Additional merged scenarios');

    // Provider / Auth configuration visibility and client-id readonly
    console.log('  - Provider / Auth configuration checks');
    try {
      // try to find provider config area
      const providerSection = page.locator('text=Provider, text=Auth Configuration, [data-testid="provider-config"]');
      if (await providerSection.count()) {
        console.log('    Provider section visible: ✅');
        const clientIdInputs = await page.locator('input[name="clientId"], [data-testid="client-id"], input[readonly]').count();
        console.log(`    Client ID readonly/present: ${clientIdInputs ? '✅' : '❌'}`);
      } else {
        console.log('    Provider section not found — skipping provider checks');
      }
    } catch (e) { console.log('    Error:', e.message || e); }

    // Issuer / Tenant / Audience URL validations (format checks)
    console.log('  - Issuer / Tenant / Audience URL format checks');
    try {
      const issuer = page.locator('input[name="issuer"], input[placeholder*="issuer"], [data-testid="issuer"]');
      if (await issuer.count()) {
        await issuer.fill('not-a-url');
        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Validate")').first();
        await saveBtn.click().catch(()=>{});
        const formatErr = await page.locator('text=Invalid URL, text=Enter a valid URL, [role="alert"]').first().count();
        console.log(`    Issuer URL validation shown: ${formatErr ? '✅' : '❌'}`);
      } else console.log('    Issuer input not found — skipped');
    } catch (e) { console.log('    Error:', e.message || e); }

    // Tenant ID and description/limits
    console.log('  - Tenant ID and description length checks');
    try {
      const tenant = page.locator('input[name="tenantId"], [data-testid="tenant-id"]');
      if (await tenant.count()) {
        await tenant.fill('');
        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Create")').first();
        await saveBtn.click().catch(()=>{});
        const tenantErr = await page.locator('text=required, text=Tenant ID, [role="alert"]').first().count();
        console.log(`    Tenant required validation shown: ${tenantErr ? '✅' : '❌'}`);
      }
      const desc = page.locator('textarea[name="description"], [data-testid="description"]');
      if (await desc.count()) {
        const long = 'x'.repeat(2001);
        await desc.fill(long);
        const tooLongErr = await page.locator('text=maximum|text=limit|[role="alert"]').first().count();
        console.log(`    Description length validation: ${tooLongErr ? '✅' : '❌'}`);
      }
    } catch (e) { console.log('    Error:', e.message || e); }

    // User type dropdown
    console.log('  - User type dropdown presence');
    try {
      const userType = page.locator('select[name="userType"], [data-testid="user-type"]');
      console.log(`    User type dropdown present: ${await userType.count() ? '✅' : '❌'}`);
    } catch (e) { console.log('    Error:', e.message || e); }

    // Phone number field validations
    console.log('  - Phone number validation checks');
    try {
      const phone = page.locator('input[type="tel"], input[name*="phone"], [data-testid="phone"]');
      if (await phone.count()) {
        await phone.fill('123');
        const shortErr = await page.locator('text=invalid|text=too short|[role="alert"]').first().count();
        await phone.fill('+' + '1'.repeat(20));
        const longErr = await page.locator('text=too long|text=maximum|[role="alert"]').first().count();
        console.log(`    Short format validation: ${shortErr ? '✅' : '❌'}, Long format validation: ${longErr ? '✅' : '❌'}`);
      } else console.log('    Phone input not found — skipped');
    } catch (e) { console.log('    Error:', e.message || e); }

    // Hospital creation and Add Hospital button behavior
    console.log('  - Hospital creation form checks');
    try {
      const addHospBtn = page.locator('button:has-text("Add Hospital") , text=Add Hospital');
      if (await addHospBtn.count()) {
        await addHospBtn.first().click().catch(()=>{});
        await page.waitForTimeout(700);
        const nameInput = page.locator('input[name="hospitalName"], input[placeholder*="Hospital"]');
        const saveHosp = page.locator('button:has-text("Create"), button:has-text("Save")').first();
        if (await nameInput.count()) {
          await nameInput.fill('');
          await saveHosp.click().catch(()=>{});
          const reqErr = await page.locator('text=required|text=Please enter|[role="alert"]').first().count();
          console.log(`    Hospital name required validation: ${reqErr ? '✅' : '❌'}`);
        } else console.log('    Hospital form inputs not found — skipped');
      } else console.log('    Add Hospital button not present — skipped');
    } catch (e) { console.log('    Error:', e.message || e); }

    // Image / file upload size check (presence only)
    console.log('  - Image/file upload checks (presence)');
    try {
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count()) console.log('    File input present: ✅'); else console.log('    File input not found: ❌');
    } catch (e) { console.log('    Error:', e.message || e); }

    // Copy / clipboard functionality
    console.log('  - Copy to clipboard checks');
    try {
      const copyBtn = page.locator('button:has-text("Copy"), [data-testid="copy"]');
      if (await copyBtn.count()) {
        await copyBtn.first().click().catch(()=>{});
        const clipText = await page.evaluate(async () => {
          try { return await navigator.clipboard.readText(); } catch (e) { return null; }
        });
        console.log(`    Clipboard content available after copy: ${clipText ? '✅' : '❌'}`);
      } else console.log('    Copy button not found — skipped');
    } catch (e) { console.log('    Error:', e.message || e); }

    // Negative invalid URL render (presence of 404/invalid page behavior)
    console.log('  - Negative invalid URL render check');
    try {
      const bad = `${BASE_URL}/non-existent-path-${Date.now()}`;
      await page.goto(bad, { waitUntil: 'domcontentloaded' }).catch(()=>{});
      const notFound = await page.locator('text=Not Found, text=404, text=Page not found').first().count();
      console.log(`    Invalid URL renders 404-like page: ${notFound ? '✅' : '❌'}`);
    } catch (e) { console.log('    Error:', e.message || e); }


    // Insert additional test cases here that reuse the logged-in `page`/`context`.
    console.log('\n3) Post-login checks (example):');
    // Example: check dashboard title or presence of a known selector
    try {
      const dashboardSelector = 'text=Dashboard, text=Home, [data-testid="dashboard"]';
      const found = await page.locator(dashboardSelector).first().count();
      console.log(`  Dashboard visible: ${found ? '✅' : '❌'}`);
    } catch (e) {
      console.log('  Post-login check error (ignored):', e.message || e);
    }

    console.log('\nConsolidated scenarios completed.');
  } catch (e) {
    console.error('Run error:', e.message || e);
  } finally {
    try { await browser.close(); } catch (err) {}
    process.exit(0);
  }
}

runAll();

