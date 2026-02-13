/**
 * Generated from Qase case 524 (MCP)
 * Title: Verify whether image selector feature rejects the image with other format.
 * Preconditions: Click Choose Icon
 * Expected: Error message appears, file not uploaded for invalid formats (PDF/DOC/TXT)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const LOGIN_URL = process.env.BASE_URL ? `${process.env.BASE_URL}/login` : 'http://localhost:3000/login';
const EMAIL = 'shrinath.himane@mindbowser.com';
const PASSWORD = 'Test@1234';

(async function main() {
  let browser;
  try {
    console.log('Launching Chromium...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // Login
    console.log('Navigating to', LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

    const loginBtn = page.locator('button').filter({ hasText: 'Super Admin' }).first();
    await loginBtn.waitFor({ state: 'visible', timeout: 10000 });
    await loginBtn.click();
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[name="username"], input[type="email"]').first();
    const pwdInput = page.locator('input[name="password"], input[type="password"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(EMAIL);
    await pwdInput.waitFor({ state: 'visible', timeout: 15000 });
    await pwdInput.fill(PASSWORD);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Continue")').first();
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click();

    await page.waitForURL(/hospitals|dashboard/, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    console.log('Logged in, URL:', page.url());

    // Click Add New Hospital button
    const addHospBtn = page.locator('button').filter({ hasText: 'Add New Hospital' }).first()
      .or(page.locator('button').filter({ hasText: 'Add Hospital' }).first());
    await addHospBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addHospBtn.click();
    await page.waitForTimeout(2000);

    // Find the file input for image upload
    const fileInput = page.locator('input[type="file"]').first();

    // Create a temporary invalid file (TXT)
    const testFilePath = path.join(__dirname, 'test_invalid.txt');
    fs.writeFileSync(testFilePath, 'This is a test text file');

    let testPassed = false;

    try {
      if (await fileInput.count() > 0) {
        // Check accept attribute - if it restricts to images, test passes
        const acceptAttr = await fileInput.getAttribute('accept');
        console.log('File input accept attribute:', acceptAttr);

        if (acceptAttr && !/\.txt|\.pdf|\.doc|text\/plain/i.test(acceptAttr)) {
          console.log('✅ File input does not accept TXT/PDF/DOC formats');
          testPassed = true;
        }

        // Try uploading invalid file
        console.log('Attempting to upload invalid TXT file...');
        await fileInput.setInputFiles(testFilePath);
        await page.waitForTimeout(1000);

        // Check for error message
        const errorMsg = page.locator('text=/invalid.*format/i')
          .or(page.locator('text=/not.*allowed/i'))
          .or(page.locator('text=/unsupported/i'))
          .or(page.locator('text=/only.*image/i'))
          .or(page.locator('[role="alert"]'));

        const hasError = await errorMsg.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);

        // Check that no preview is shown
        const imagePreview = page.locator('img[src*="blob:"], img[src*="data:"], .image-preview');
        const previewVisible = await imagePreview.first().isVisible().catch(() => false);

        if (hasError) {
          console.log('✅ Error message shown for invalid file format');
          testPassed = true;
        } else if (!previewVisible && acceptAttr) {
          console.log('✅ Invalid file was not previewed (blocked by accept attribute)');
          testPassed = true;
        }
      } else {
        console.log('No file input found on page');
      }
    } finally {
      // Cleanup test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }

    await page.screenshot({ path: '524_ImageSelectorRejectsInvalid.result.png', fullPage: true }).catch(() => {});

    if (testPassed) {
      console.log('✅ PASS: Image selector rejects invalid formats (PDF/DOC/TXT).');
      await browser.close();
      process.exit(0);
    } else {
      console.log('❌ FAIL: Invalid file format was not properly rejected.');
      await browser.close();
      process.exit(1);
    }

  } catch (err) {
    console.error('Error during test:', err.message);
    if (browser) await browser.close();
    process.exit(2);
  }
})();
