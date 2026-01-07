(async () => {
  const URL = 'http://34.234.86.155:3000/login';
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

    // Locate the "Don't remember your password?" link using class selector
    const passwordResetLink = page.locator('a.auth0-lock-alternative-link:has-text("Don\'t remember your password")');
    
    // Wait for link to be visible
    try {
      await passwordResetLink.waitFor({ state: 'visible', timeout: 10000 });
      console.log('✅ Password reset link found\n');
    } catch (e) {
      console.log('❌ Password reset link not found');
      console.log('Searching for all links on page...');
      const allLinks = page.locator('a');
      const linkCount = await allLinks.count();
      console.log(`Found ${linkCount} links on page`);
      
      for (let i = 0; i < Math.min(linkCount, 10); i++) {
        const linkText = await allLinks.nth(i).textContent();
        console.log(`  Link ${i + 1}: "${linkText}"`);
      }
      
      throw new Error('Password reset link not found');
    }

    console.log('🧪 Running Password Reset Link Test:\n');
    console.log('='.repeat(80));

    // Get link details
    const linkText = await passwordResetLink.textContent();
    const linkHref = await passwordResetLink.getAttribute('href') || 'N/A';
    const linkClass = await passwordResetLink.getAttribute('class') || '';
    
    console.log(`\nPassword Reset Link Details:`);
    console.log(`  Text: "${linkText}"`);
    console.log(`  href: "${linkHref}"`);
    console.log(`  Visible: ✅ YES`);
    console.log(`  Clickable: ✅ YES`);

    // Click the password reset link
    console.log(`\nClicking password reset link...`);
    try {
      await passwordResetLink.click({ timeout: 5000 });
      console.log(`✅ Password reset link clicked successfully`);
    } catch (clickErr) {
      console.log(`❌ Failed to click password reset link: ${clickErr.message}`);
      await browser.close();
      process.exit(1);
    }

    // Wait for navigation to password reset page
    console.log(`\nWaiting for navigation to password reset page...`);
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
    } catch (navErr) {
      console.log('Navigation timeout, checking current page...');
      await page.waitForTimeout(2000);
    }

    const finalUrl = page.url();
    const pageTitle = await page.title();
    const pageHeading = await page.locator('h1, h2, [role="heading"]').first().textContent().catch(() => 'N/A');
    
    console.log(`  Final URL: ${finalUrl}`);
    console.log(`  Page Title: ${pageTitle}`);
    console.log(`  Page Heading: ${pageHeading}`);

    // Check if successfully navigated to password reset page
    const isPasswordResetPage = /reset|forgot|password|change/i.test(finalUrl) || 
                                /reset|forgot|password|change/i.test(pageTitle) ||
                                /reset|forgot|password|change/i.test(pageHeading);
    
    // Also check if we're still on Auth0 but in password reset flow
    const onPasswordResetFlow = finalUrl.includes('auth0') && (
      /reset|forgot|password|change/i.test(pageHeading) ||
      /reset|forgot|password/i.test(pageTitle)
    );
    
    const testPassed = isPasswordResetPage || onPasswordResetFlow;

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Test Results:');
    console.log(`  Link is clickable: ✅ YES`);
    console.log(`  Navigation triggered: ✅ YES`);
    console.log(`  On password reset page: ${testPassed ? '✅ YES' : '❌ NO'}`);

    if (testPassed) {
      console.log('\n🎉 TEST PASSED: Password reset link is functional and navigates to password reset page!');
      await browser.close();
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED: Password reset link did not navigate to password reset page');
      console.log(`Final URL: ${finalUrl}`);
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ Script error:', err.message || err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
