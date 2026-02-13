const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    // Navigate to login and sign in as Super Admin
    await page.goto('http://34.234.86.155:3000/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.waitForSelector('text=Login as Super Admin', { state: 'visible' });
    await page.click('text=Login as Super Admin');
    await page.waitForTimeout(1000);

    await page.fill('xpath=//input[@id="1-email"]', 'shrinath.himane@mindbowser.com');
    await page.fill('xpath=//input[@id="1-password"]', 'Test@1234');
    await page.click('xpath=//span[@class="auth0-label-submit"]');

    // Wait for app to load
    await page.waitForTimeout(2000);

    // Locate the sidebar toggle button using the provided outer element attributes
    const sidebarButton = page.locator('button[data-sidebar="trigger"][aria-label="Toggle sidebar"]');
    await sidebarButton.waitFor({ state: 'visible', timeout: 10000 });

    // Click the button, wait 8s, click again
    await page.waitForTimeout(2000);
    await sidebarButton.click();
    console.log('Clicked sidebar toggle (1)');
    await page.waitForTimeout(8000);
    await sidebarButton.click();
    console.log('Clicked sidebar toggle (2)');

    await page.waitForTimeout(1000);
    await browser.close();
  } catch (err) {
    console.error('Script failed:', err);
    try { await browser.close(); } catch {};
    process.exit(1);
  }
})();
