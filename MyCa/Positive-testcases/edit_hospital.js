const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Step 1: Login as Super Admin
  await page.goto('http://34.234.86.155:3000/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await page.waitForSelector('text=Login as Super Admin', { state: 'visible' });
  await page.click('text=Login as Super Admin');
  await page.waitForTimeout(1000);

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

  // Step 2: Click on the hospital name 'Chicago Cancer Care Hospital'
  await page.waitForSelector('text=Chicago Cancer Care Hospital', { state: 'visible' });
  await page.click('text=Chicago Cancer Care Hospital');
  await page.waitForTimeout(1000);
  console.log('Clicked on hospital name Chicago Cancer Care Hospital');

  // Step 3: Click Edit button on the top right corner
  await page.waitForSelector('text=Edit', { state: 'visible' });
  await page.click('text=Edit');
  await page.waitForTimeout(1000);
  console.log('Clicked Edit button');

  // Step 4: Enter 'Automation script' in Hospital name field using provided XPath
  const hospitalNameXPath = '//input[@class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border-gray-200"][1]';
  await page.waitForSelector(`xpath=${hospitalNameXPath}`, { state: 'visible' });
  await page.waitForFunction((xpath) => {
    const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    return el && !el.disabled;
  }, hospitalNameXPath);
  await page.click(`xpath=${hospitalNameXPath}`);
  await page.fill(`xpath=${hospitalNameXPath}`, 'Automation script');
  await page.waitForTimeout(1000);
  console.log('Entered Automation script in Hospital name field');

  // Scroll down and click on the Choose Icon button
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(500);
  await page.waitForSelector('text=Choose Icon', { state: 'visible' });
  await page.click('text=Choose Icon');
  await page.waitForTimeout(500);
  console.log('Clicked Choose Icon button');

  await browser.close();
  console.log('Browser closed');
})();
