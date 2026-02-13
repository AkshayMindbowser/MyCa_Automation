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

  // Step 2: Click on 'Chicago Cancer Care Hospital' hospital name
  await page.waitForSelector('text=Chicago Cancer Care Hospital', { state: 'visible' });
  await page.click('text=Chicago Cancer Care Hospital');
  await page.waitForTimeout(1000);
  console.log('Clicked on Chicago Cancer Care Hospital');

  // Step 3: Click on Edit Profile button
  await page.waitForSelector('text=Edit Profile', { state: 'visible' });
  await page.click('text=Edit Profile');
  await page.waitForTimeout(1000);
  console.log('Clicked Edit Profile button');

  // Step 4: Click on the address bar (try multiple selectors but verify it's the Address field)
  const addressSelectors = [
    'xpath=//input[contains(@placeholder,"Address")]',
    'xpath=//*[@id="«r9e»-form-item"]',
    'xpath=//input[contains(@id,"form-item")]',
    'xpath=//label[contains(translate(., "ADDRESS", "address"), "address")]/following::input[1]',
    'css=input[placeholder*="Address"]'
  ];

  let filled = false;
  let addressHandle = null;
  for (const sel of addressSelectors) {
    try {
      await page.waitForSelector(sel, { state: 'visible', timeout: 3000 });
      const handles = await page.$$(sel);
      for (const h of handles) {
        const isAddress = await page.evaluate((el) => {
          const text = (s) => (s || '').toString().toLowerCase();
          const placeholder = text(el.getAttribute('placeholder'));
          const aria = text(el.getAttribute('aria-label'));
          if (placeholder.includes('address') || aria.includes('address')) return true;

          const id = el.id || '';
          if (id) {
            const lbl = document.querySelector(`label[for="${id}"]`);
            if (lbl && text(lbl.innerText).includes('address')) return true;
          }

          // Check previous siblings for a label or text that contains 'address'
          let p = el.previousElementSibling;
          while (p) {
            if (p.tagName && p.tagName.toLowerCase() === 'label' && text(p.innerText).includes('address')) return true;
            if (p.innerText && text(p.innerText).includes('address')) return true;
            p = p.previousElementSibling;
          }

          // Check closest ancestor label
          const ancLabel = el.closest('label');
          if (ancLabel && text(ancLabel.innerText).includes('address')) return true;

          return false;
        }, h);

        if (isAddress) {
          await h.scrollIntoViewIfNeeded();
          await h.click();
          try {
            await h.fill('this is automated text');
            await page.waitForTimeout(3000); // wait 3s after filling
            console.log('Filled address field with: this is automated text (waited 3s)');
            filled = true;
            addressHandle = h;
            break;
          } catch (fillErr) {
            console.error('Failed to fill the matched address element:', fillErr);
          }
        }
      }
      if (filled) break;
    } catch (e) {
      // selector not found or not visible within timeout; continue to next
    }
  }

  if (!filled) {
    console.error('Address field not found or verified using candidate selectors. Dumping page HTML snippet to help debug...');
    const html = await page.content();
    console.error(html.slice(0, 8000));
  } else {
    // Find the next input (phone) after the address element in document order and fill it
    try {
      const phoneHandle = await page.evaluateHandle((el) => {
        // Helper: find the next input element in document order after 'el'
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null, false);
        walker.currentNode = el;
        let node = null;
        while ((node = walker.nextNode())) {
          if (node.tagName && node.tagName.toLowerCase() === 'input') return node;
        }
        return null;
      }, addressHandle);

      const phoneElem = phoneHandle.asElement ? phoneHandle.asElement() : null;
      if (phoneElem) {
        await phoneElem.scrollIntoViewIfNeeded();
        await phoneElem.click();
        await phoneElem.fill('4747474747');
        await page.waitForTimeout(500);
        console.log('Filled phone field with: 4747474747');
      } else {
        console.error('Phone input not found after address element');
      }
    } catch (e) {
      console.error('Error while locating/filling phone field:', e);
    }
  }

  await browser.close();
  console.log('Browser closed');
})();
