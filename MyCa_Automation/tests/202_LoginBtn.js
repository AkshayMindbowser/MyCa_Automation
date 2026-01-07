(async () => {
  const URL = 'http://34.234.86.155:3000/login';
  const validEmail = 'shrinath.himane@mindbowser.com';
  const validPassword = 'Test@1234';
  
  let browser;
  try {
    const { chromium } = require('playwright');
    console.log('Launching Chromium (headful)...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to', URL);
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Click "Login as Super Admin" button to go to Auth0 page
    const loginAsAdminBtn = page.locator('button:has-text("Login as Super Admin")');
    console.log('Clicking "Login as Super Admin" button...');
    await loginAsAdminBtn.waitFor({ state: 'visible', timeout: 5000 });
    await loginAsAdminBtn.click({ timeout: 5000 });

    // Wait for Auth0 page to load
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (navErr) {
      console.log('Navigation timeout, waiting a bit...');
      await page.waitForTimeout(3000);
    }

    // Locate email, password fields and login button on Auth0 page
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const loginBtn = page.locator('button:has-text("Continue"), button:has-text("Login"), button[type="submit"]').first();
    
    // Wait for fields to be visible
    try {
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      console.log('✅ Email input field found');
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Password input field found');
      await loginBtn.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Login button found\n');
    } catch (e) {
      console.log('❌ Required fields not found on Auth0 page');
      throw new Error('Email, password field, or login button not found');
    }

    console.log('🧪 Running Login Button Functionality Test:\n');
    console.log('='.repeat(80));

    // Get login button details
    const loginBtnText = await loginBtn.textContent();
    const loginBtnClass = await loginBtn.getAttribute('class') || '';
    const loginBtnDisabled = await loginBtn.getAttribute('disabled');
    
    console.log(`\nLogin Button Details:`);
    console.log(`  Text: "${loginBtnText}"`);
    console.log(`  Disabled: ${loginBtnDisabled ? 'Yes' : 'No'}`);
    console.log(`  Clickable: ${loginBtnDisabled ? '❌ NO' : '✅ YES'}`);

    // Fill in valid credentials
    console.log(`\nFilling in credentials:`);
    await emailInput.clear();
    await emailInput.fill(validEmail);
    console.log(`  Email: ${validEmail}`);
    
    await passwordInput.clear();
    await passwordInput.fill(validPassword);
    console.log(`  Password: ******* (${validPassword.length} characters)`);

    await page.waitForTimeout(500);

    // Click the login button
    console.log(`\nClicking Login button...`);
    try {
      await loginBtn.click({ timeout: 5000 });
      console.log(`✅ Login button clicked successfully`);
    } catch (clickErr) {
      console.log(`❌ Failed to click login button: ${clickErr.message}`);
      await browser.close();
      process.exit(1);
    }

    // Wait for navigation to dashboard
    console.log(`\nWaiting for navigation to dashboard...`);
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
    } catch (navErr) {
      console.log('Navigation timeout, checking current page...');
      await page.waitForTimeout(2000);
    }

    const finalUrl = page.url();
    const pageTitle = await page.title();
    
    console.log(`  Final URL: ${finalUrl}`);
    console.log(`  Page Title: ${pageTitle}`);

    // Check if successfully navigated to dashboard
    const isDashboard = /dashboard|home|hospital|profile/i.test(finalUrl) || 
                        !finalUrl.includes('auth0');
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Test Results:');
    console.log(`  Login button clickable: ✅ YES`);
    console.log(`  Navigation to dashboard: ${isDashboard ? '✅ YES' : '❌ NO'}`);
    console.log(`  URL changed from Auth0: ${!finalUrl.includes('auth0') ? '✅ YES' : '❌ NO'}`);

    if (isDashboard && !finalUrl.includes('auth0')) {
      console.log('\n🎉 TEST PASSED: Login button is functional and navigates to dashboard!');
      await browser.close();
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED: Login button did not navigate to dashboard');
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ Script error:', err.message || err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
