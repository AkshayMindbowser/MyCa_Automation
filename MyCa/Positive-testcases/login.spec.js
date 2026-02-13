const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Step 1: Navigate to login page
  await page.goto('http://34.234.86.155:3000/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  console.log('Navigated to login page');

  // Step 2: Click 'Login as Super Admin' button
  await page.waitForSelector('text=Login as Super Admin', { state: 'visible' });
  await page.click('text=Login as Super Admin');
  await page.waitForTimeout(1000);
  console.log('Clicked Login as Super Admin');

  // Step 3: Enter credentials and log in
  await page.waitForSelector('xpath=//input[@id="1-email"]', { state: 'visible' });
  await page.click('xpath=//input[@id="1-email"]');
  await page.fill('xpath=//input[@id="1-email"]', 'shrinath.himane@mindbowser.com');
  await page.waitForTimeout(1000);

  await page.waitForSelector('xpath=//input[@id="1-password"]', { state: 'visible' });
  await page.click('xpath=//input[@id="1-password"]');
  await page.fill('xpath=//input[@id="1-password"]', 'Test@1234');
  await page.waitForTimeout(1000);

  await page.waitForSelector('xpath=//span[@class="auth0-label-submit"]', { state: 'visible' });
  await page.click('xpath=//span[@class="auth0-label-submit"]');
  await page.waitForTimeout(2000);
  console.log('Logged in as Super Admin');

  
  

  await browser.close();
  console.log('Browser closed');
})();
