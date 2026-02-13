(async () => {
  const URL = 'http://localhost:3000/login';
  let browser;
  try {
    const { chromium } = require('playwright');
    console.log('Launching Chromium (headful)...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to', URL);
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Locate and click the "Login as Super Admin" button
    const btn = page.locator('button:has-text("Login as Super Admin")');
    console.log('Waiting for the button to be visible...');
    await btn.waitFor({ state: 'visible', timeout: 10000 });

    console.log('Clicking the "Login as Super Admin" button...');
    await btn.click({ timeout: 5000 });

    // Wait for page to load and check title
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (navErr) {
      console.log('Navigation timeout, checking current page title...');
      await page.waitForTimeout(3000);
    }

    const pageTitle = await page.title();
    console.log('\n📄 Page Title:', pageTitle);

    // Check if title matches "Sign In with Auth0"
    const titleMatches = pageTitle === 'Sign In with Auth0';

    console.log('\n✓ Test Result:');
    console.log('  Page Title matches "Sign In with Auth0":', titleMatches ? '✅ PASS' : '❌ FAIL');

    if (titleMatches) {
      console.log('\n🎉 TEST PASSED: Page redirected to Auth0 Sign In!');
      await browser.close();
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED: Page title does not match expected "Sign In with Auth0"');
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Script error:', err.message || err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
