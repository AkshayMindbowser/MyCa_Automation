const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    // Login
    await page.goto('http://34.234.86.155:3000/login');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('text=Login as Super Admin', { state: 'visible' });
    await page.click('text=Login as Super Admin');

    await page.fill('xpath=//input[@id="1-email"]', 'shrinath.himane@mindbowser.com');
    await page.fill('xpath=//input[@id="1-password"]', 'Test@1234');
    await page.click('xpath=//span[@class="auth0-label-submit"]');

    // Wait for app to load and sidebar/menu to be present
    await page.waitForTimeout(3000);

    // 1) Wait 3 seconds then try to robustly find and click a Settings item in the sidebar
    await page.waitForTimeout(3000);
    // Try to find a sidebar container and then an element within it that contains the word "settings"
    const settingsHandle = await page.evaluateHandle(() => {
      const containers = document.querySelectorAll('nav, aside, [role="navigation"], [data-sidebar]');
      for (const c of containers) {
        const candidates = c.querySelectorAll('a,button,li,span');
        for (const el of candidates) {
          if (!el.innerText) continue;
          if (el.innerText.toLowerCase().includes('settings')) return el;
        }
      }
      // As a fallback search the whole document
      const all = document.querySelectorAll('a,button,li,span');
      for (const el of all) {
        if (!el.innerText) continue;
        if (el.innerText.toLowerCase().includes('settings')) return el;
      }
      return null;
    });

    if (settingsHandle && settingsHandle.asElement()) {
      try {
        await page.evaluate(el => el.click(), settingsHandle);
        console.log('Clicked Settings via DOM search');
        // Try to detect the sidebar anchor href and navigate directly if click didn't trigger the SPA router
        try {
          const href = await page.evaluate(() => {
            const a = Array.from(document.querySelectorAll('a')).find(el => el.innerText && el.innerText.toLowerCase().includes('settings'));
            return a ? a.getAttribute('href') : null;
          });
          if (href) {
            const target = new URL(href, page.url()).toString();
            console.log('Navigating directly to', target);
            await page.goto(target);
            await page.waitForLoadState('networkidle');
          } else {
            // Fallback: wait briefly for any Settings header to appear
            try {
              await page.waitForSelector('text=Settings', { timeout: 6000 });
              console.log('Settings text appeared');
            } catch (selErr) {
              console.log('No explicit settings href or header detected — will continue with DOM fallbacks');
            }
          }
        } catch (navErr) {
          console.warn('Error while trying to navigate to settings page:', navErr);
        }
      } catch (e) {
        console.error('Failed to click Settings element found via DOM search:', e);
        await browser.close();
        return;
      }
    } else {
      console.error('Failed to locate a Settings element in the sidebar. Saved page snapshot for debugging.');
      try {
        await page.screenshot({ path: 'settings_not_found.png', fullPage: true });
        const fs = require('fs');
        fs.writeFileSync('settings_not_found.html', await page.content());
        console.error('Saved settings_not_found.png and settings_not_found.html');
      } catch (dumpErr) {
        console.error('Failed to save debug artifacts:', dumpErr);
      }
      await browser.close();
      return;
    }

    // 2) Wait for 3 seconds
    await page.waitForTimeout(3000);

    // 3) Click Change Password toggle/button (try multiple strategies)
    const changePwdSelectors = [
      // Plain text (case-sensitive)
      'text=Change Password',
      // XPath that looks for text-containing buttons
      'xpath=//button[.//text()[contains(., "Change Password")]]',
    ];

    let clickedChange = false;
    for (const sel of changePwdSelectors) {
      try {
        await page.waitForSelector(sel, { state: 'visible', timeout: 2000 });
        await page.click(sel);
        clickedChange = true;
        console.log('Clicked Change Password using selector:', sel);
        break;
      } catch (e) {
        // try next
      }
    }

    // DOM-search fallback (case-insensitive) if above selectors fail
    if (!clickedChange) {
      try {
        const cpHandle = await page.evaluateHandle(() => {
          const candidates = Array.from(document.querySelectorAll('a,button,label,div,span'));
          const target = candidates.find(el => el.innerText && el.innerText.toLowerCase().includes('change password'));
          return target || null;
        });
        if (cpHandle && cpHandle.asElement()) {
          await page.evaluate(el => el.click(), cpHandle);
          clickedChange = true;
          console.log('Clicked Change Password via DOM-search fallback');
        }
      } catch (e) {
        // ignore and continue to debug
      }
    }

    if (!clickedChange) {
      console.error('Failed to find/click Change Password. Saving debug snapshot.');
      try {
        await page.screenshot({ path: 'change_password_not_found.png', fullPage: true });
        const fs = require('fs');
        fs.writeFileSync('change_password_not_found.html', await page.content());
        console.error('Saved change_password_not_found.png and change_password_not_found.html');
      } catch (dumpErr) {
        console.error('Failed to save debug artifacts:', dumpErr);
      }
    }

    // After toggling Change Password, click the "Change Password via Auth0" button if present
    // Note: the actual button text is "Change Password via Auth0" (lowercase 'via') — use case-insensitive regex
    const auth0Selectors = [
      // Regex (case-insensitive) that will match 'Change Password via Auth0' regardless of case
      { type: 'regex', value: /Change\s*Password\s*.*Auth0/i },
      // Playwright :has-text variant (works if casing matches)
      'button:has-text("Change Password via Auth0")',
      // XPath fallback
      'xpath=//button[.//text()[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "change password") and contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "auth0")]]'
    ];

    let clickedAuth0 = false;
    for (const aSel of auth0Selectors) {
      try {
        if (typeof aSel === 'string') {
          await page.waitForSelector(aSel, { state: 'visible', timeout: 3000 });
          await page.click(aSel);
          clickedAuth0 = true;
          console.log('Clicked Change Password via Auth0 using selector:', aSel);
          break;
        } else if (aSel.type === 'regex') {
          const btn = await page.locator('button').filter({ hasText: aSel.value }).first();
          const count = await btn.count();
          if (count > 0) {
            await btn.click();
            clickedAuth0 = true;
            console.log('Clicked Change Password via Auth0 using regex locator');
            break;
          }
        }
      } catch (e) {
        // try next
      }
    }

    // DOM fallback for Auth0 button
    if (!clickedAuth0) {
      try {
        const authHandle = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(b => b.innerText && b.innerText.toLowerCase().includes('change password') && b.innerText.toLowerCase().includes('auth0')) || null;
        });
        if (authHandle && authHandle.asElement()) {
          await page.evaluate(el => el.click(), authHandle);
          clickedAuth0 = true;
          console.log('Clicked Change Password via Auth0 via DOM-search fallback');
        }
      } catch (e) {
        // ignore
      }
    }

    if (!clickedAuth0) {
      console.error('Change Password via Auth0 button not found. Saving debug snapshot.');
      try {
        await page.screenshot({ path: 'auth0_button_not_found.png', fullPage: true });
        const fs = require('fs');
        fs.writeFileSync('auth0_button_not_found.html', await page.content());
        console.error('Saved auth0_button_not_found.png and auth0_button_not_found.html');
      } catch (dumpErr) {
        console.error('Failed to save debug artifacts for auth0 button:', dumpErr);
      }
    }

    await page.waitForTimeout(1000);
    await browser.close();
  } catch (err) {
    console.error('Script failed:', err);
    try { await browser.close(); } catch {};
    process.exit(1);
  }
})();
