const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    // Login
    await page.goto('http://34.234.86.155:3000/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Login as Super Admin', { state: 'visible', timeout: 10000 });
    await page.click('text=Login as Super Admin');
    await page.fill('xpath=//input[@id="1-email"]', 'shrinath.himane@mindbowser.com');
    await page.fill('xpath=//input[@id="1-password"]', 'Test@1234');
    await page.click('xpath=//span[@class="auth0-label-submit"]');

    // Wait for hospitals listing or heading to ensure we're on the correct page
    await page.waitForSelector('text=Hospital Management', { timeout: 15000 }).catch(() => {});
    // Give the UI 3 seconds per your instruction then click the three-dots button
    console.log('Waiting 3 seconds before clicking the three-dots button...');
    await page.waitForTimeout(3000);

    // Robust locator for the three-dots menu button using the sr-only text 'Open menu'
    const moreButtonLocator = page.locator('button:has(span.sr-only:has-text("Open menu"))').first();

    try {
      await moreButtonLocator.waitFor({ state: 'visible', timeout: 8000 });
      await moreButtonLocator.click();
      console.log('Clicked the three-dots (Open menu) button.');
    } catch (e) {
      console.error('Failed to find/click the three-dots button using sr-only locator:', e.message);
      // Try a fallback: any button containing the ellipsis svg icon (class lucide-ellipsis-vertical)
      const svgBtn = page.locator('button:has(svg.lucide-ellipsis-vertical)').first();
      try {
        await svgBtn.waitFor({ state: 'visible', timeout: 5000 });
        await svgBtn.click();
        console.log('Clicked three-dots button via svg fallback.');
      } catch (e2) {
        console.error('Fallback svg locator also failed:', e2.message);
        // Save debug artifacts
        try { await page.screenshot({ path: 'click_three_dots_not_found.png', fullPage: true }); } catch {}
        try { const fs = require('fs'); fs.writeFileSync('click_three_dots_not_found.html', await page.content()); } catch {}
        throw new Error('Three-dots button not found');
      }
    }

    // Completed
    await page.waitForTimeout(1000);
    await browser.close();
    console.log('Script finished successfully.');
  } catch (err) {
    console.error('Script failed:', err.message || err);
    try { await browser.close(); } catch {};
    process.exit(1);
  }
})();
