const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  // Single top-level try/catch for simpler error handling
  try {
    // Launch maximized and use viewport null to match window size
    const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // Helper to wait and click if visible
    const waitAndClick = async (selector, timeout = 5000) => {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      if (await page.isVisible(selector)) {
        await page.click(selector);
        return true;
      }
      return false;
    };

    // Login
    await page.goto('http://34.234.86.155:3000/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await waitAndClick('text=Login as Super Admin');
    await page.fill('xpath=//input[@id="1-email"]', 'shrinath.himane@mindbowser.com');
    await page.fill('xpath=//input[@id="1-password"]', 'Test@1234');
    await waitAndClick('xpath=//span[@class="auth0-label-submit"]');
    await page.waitForTimeout(2000);

    // Open hospital editor
    await waitAndClick('text=Chicago Cancer Care Hospital');
    await page.waitForTimeout(1000);
    await waitAndClick('text=Edit');
    await page.waitForTimeout(1000);

    // Scroll and open Choose Icon
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    const chooseClicked = await waitAndClick('text=Choose Icon', 5000);
    if (!chooseClicked) throw new Error('Choose Icon button not found');

    // Prepare candidate file paths and pick the first that exists
    const base = 'C:\\Users\\akshay.khandale\\Downloads\\2507a1ec-1d8b-46ae-a113-2929195c3615';
    const exts = ['', '.png', '.jpg', '.jpeg', '.svg', '.gif'];
    const candidates = exts.map(e => base + e);
    const found = candidates.find(p => { try { return fs.existsSync(p) && fs.statSync(p).isFile(); } catch { return false; } });

    if (!found) {
      console.error('No local file found. Tried:', candidates.join(', '));
      // Click Choose Icon to allow manual upload and bail out
      // (we already clicked it above but keep for robustness)
      return await browser.close();
    }

    // Trigger file chooser and set file
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text=Choose Icon')
    ]);
    await fileChooser.setFiles(found);
    console.log('File selected for upload:', found);

    // Wait for UI to react and attempt to click Apply Crop if present
    await page.waitForTimeout(4000);
    const applySelector = 'text=Apply Crop';
    if (await page.locator(applySelector).count() > 0 && await page.isVisible(applySelector)) {
      await page.click(applySelector);
      console.log('Clicked Apply Crop');
    }

    // Wait for an upload preview or confirmation (longer timeout)
    const previewSelector = '.upload-success, .icon-preview, img[src*="2507a1ec-1d8b-46ae-a113-2929195c3615"]';
    try {
      await page.waitForSelector(previewSelector, { state: 'visible', timeout: 15000 });
      console.log('Upload appears to have completed or preview is visible');
    } catch {
      // Save debug artifacts to help inspection
      const ssPath = 'upload_debug.png';
      await page.screenshot({ path: ssPath, fullPage: true });
      fs.writeFileSync('upload_debug.html', await page.content());
      console.error('No upload confirmation/preview detected. Saved debug artifacts:', ssPath, 'upload_debug.html');
    }

    await browser.close();
  } catch (err) {
    console.error('Script failed:', err);
  }
})();
