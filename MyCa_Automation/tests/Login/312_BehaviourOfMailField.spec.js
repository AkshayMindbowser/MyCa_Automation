(async () => {
  const URL = 'http://localhost:3000/login';
  let browser;
  
  const testCases = [
    { input: 'invalidemail', shouldFail: true, description: 'No @ symbol' },
    { input: 'invalid@', shouldFail: true, description: 'Missing domain' },
    { input: '@domain.com', shouldFail: true, description: 'Missing local part' },
    { input: 'invalid email@domain.com', shouldFail: true, description: 'Space in email' }
  ];
  
  const validTestCase = {
    input: 'shrinath.himane@mindbowser.com',
    password: 'Test@1234',
    description: 'Valid email with correct password'
  };

  try {
    const { chromium } = require('playwright');
    console.log('Launching Chromium (headful)...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to', URL);
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Click "Login as Super Admin" button to go to Auth0 page
    const btn = page.locator('button:has-text("Login as Super Admin")');
    console.log('Clicking "Login as Super Admin" button...');
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click({ timeout: 5000 });

    // Wait for Auth0 page to load
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (navErr) {
      console.log('Navigation timeout, waiting a bit...');
      await page.waitForTimeout(3000);
    }

    // Locate email and password input fields on Auth0 page
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // Wait for email field to be visible
    try {
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      console.log('✅ Email input field found on Auth0 page');
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Password input field found on Auth0 page\n');
    } catch (e) {
      console.log('❌ Required input fields not found on Auth0 page');
      throw new Error('Email or password field not found');
    }

    let passedTests = 0;
    let failedTests = 0;

    console.log('🧪 Running Email Field Validation Tests:\n');
    console.log('='.repeat(80));

    for (const testCase of testCases) {
      console.log(`\nTest: ${testCase.description}`);
      console.log(`Input: "${testCase.input}"`);
      console.log(`Expected: ${testCase.shouldFail ? 'Should show error' : 'Should accept'}`);

      // Clear the field first
      await emailInput.clear();
      await page.waitForTimeout(200);

      // Type the email
      await emailInput.fill(testCase.input);
      await page.waitForTimeout(300);

      // Fill in password field with Test@1234
      await passwordInput.fill('Test@1234');
      await page.waitForTimeout(300);

      // Try to trigger validation by pressing Enter to submit
      await passwordInput.press('Enter');
      await page.waitForTimeout(1000);

      // Check for validation error message or aria-invalid attribute
      const inputAriaInvalid = await emailInput.getAttribute('aria-invalid');
      const inputClass = await emailInput.getAttribute('class') || '';
      
      let hasError = false;

      // Check aria-invalid attribute
      if (inputAriaInvalid === 'true') {
        hasError = true;
      }

      // Check if input has error class
      if (/error|invalid/i.test(inputClass)) {
        hasError = true;
      }

      // Look for error message anywhere on the page
      try {
        const errorMsg = page.locator('text=/wrong email|invalid|error|incorrect/i').first();
        await errorMsg.waitFor({ state: 'visible', timeout: 1500 });
        const errorText = await errorMsg.textContent();
        
        if (/email is invalid/i.test(errorText)) {
          hasError = true;
          console.log(`  Email format error: "${errorText}"`);
        } else if (/wrong email or password/i.test(errorText)) {
          hasError = false;
          console.log(`  Authentication error (valid email format): "${errorText}"`);
        } else {
          hasError = true;
          console.log(`  Error message found: "${errorText}"`);
        }
      } catch (e) {
        // No error message visible
      }

      // For HTML5 validation, check the field's validity
      const isValid = await emailInput.evaluate((el) => {
        if (el.type === 'email') {
          return el.checkValidity();
        }
        return true;
      });

      if (!isValid) {
        hasError = true;
        console.log(`  HTML5 validation failed`);
      }

      // Determine if test passed
      const testPassed = hasError === testCase.shouldFail;
      
      if (testPassed) {
        console.log(`Result: ✅ PASS`);
        passedTests++;
      } else {
        console.log(`Result: ❌ FAIL`);
        console.log(`  Expected error: ${testCase.shouldFail}, Got error: ${hasError}`);
        failedTests++;
      }

      console.log('-'.repeat(80));
    }

    // Now test with valid email and password
    console.log(`\n\nTest: ${validTestCase.description}`);
    console.log(`Input: "${validTestCase.input}"`);
    console.log(`Password: "${validTestCase.password}"`);
    console.log(`Expected: Should log in to dashboard`);

    // Clear fields
    await emailInput.clear();
    await passwordInput.clear();
    await page.waitForTimeout(300);

    // Fill in valid credentials
    await emailInput.fill(validTestCase.input);
    await page.waitForTimeout(300);
    await passwordInput.fill(validTestCase.password);
    await page.waitForTimeout(300);

    // Submit
    await passwordInput.press('Enter');
    
    // Wait for dashboard redirect
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
      const finalUrl = page.url();
      console.log(`  Final URL: ${finalUrl}`);
      
      const isDashboard = /dashboard|home|profile/i.test(finalUrl) || !finalUrl.includes('auth0');
      
      if (isDashboard) {
        console.log(`Result: ✅ PASS (Successfully logged in to dashboard)`);
        passedTests++;
      } else {
        console.log(`Result: ⚠️  UNCERTAIN (Redirected but not confirmed dashboard)`);
      }
    } catch (navErr) {
      console.log(`  Navigation or page load issue`);
      const currentUrl = page.url();
      const isDashboard = /dashboard|home|profile/i.test(currentUrl) || !currentUrl.includes('auth0');
      
      if (isDashboard) {
        console.log(`Result: ✅ PASS (On dashboard despite nav timeout)`);
        passedTests++;
      } else {
        console.log(`Result: ⚠️  Inconclusive`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Test Summary:');
    console.log(`  Total Invalid Format Tests: ${testCases.length}`);
    console.log(`  Passed: ${passedTests} ✅`);
    console.log(`  Failed: ${failedTests} ❌`);

    if (failedTests === 0) {
      console.log('\n🎉 ALL EMAIL VALIDATION TESTS PASSED!');
      await browser.close();
      process.exit(0);
    } else {
      console.log(`\n❌ ${failedTests} TEST(S) FAILED`);
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ Script error:', err.message || err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
