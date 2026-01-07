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

    // Locate button using text content "Login as Super Admin"
    const btn = page.locator('button:has-text("Login as Super Admin")');
    console.log('Waiting for the button to be visible...');
    await btn.waitFor({ state: 'visible', timeout: 10000 });

    // Get button details
    const disabledAttr = await btn.getAttribute('disabled');
    const ariaDisabled = await btn.getAttribute('aria-disabled');
    const classAttr = (await btn.getAttribute('class')) || '';
    
    console.log('Button found!');
    console.log('  disabled attribute:', disabledAttr);
    console.log('  aria-disabled:', ariaDisabled);
    console.log('  has class disabled:pointer-events-none:', /disabled:pointer-events-none/.test(classAttr));

    // Always attempt to click
    try {
      console.log('Attempting to click the button...');
      await btn.click({ timeout: 5000 });
      console.log('✅ Click succeeded!');
      
      // Wait for potential navigation or response
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log('Current URL after click:', currentUrl);
      
      await browser.close();
      process.exit(0);
    } catch (clickErr) {
      console.error('❌ Click failed with error:', clickErr.message);
      
      // Try to get computed pointer-events style
      try {
        const pointerEvents = await btn.evaluate((el) => getComputedStyle(el).pointerEvents);
        console.log('Computed pointer-events:', pointerEvents);
      } catch (e) {
        console.log('Could not get computed style');
      }
      
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Script error:', err.message || err);
    if (browser) try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
