import { test, expect } from '@playwright/test';

// Increase default timeout for this E2E flow (Auth0 redirect + UI waits)
test.setTimeout(120000);

const BASE_LOGIN = 'http://34.234.86.155:3000/login';

// Credentials MUST be provided via environment variables to avoid hardcoding in tests.
const SA_EMAIL = process.env.SUPERADMIN_EMAIL;
const SA_PASSWORD = process.env.SUPERADMIN_PASSWORD;
if (!SA_EMAIL || !SA_PASSWORD) {
  throw new Error('Environment variables SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set before running this test');
}

async function tryFill(page, selectors, value) {
  for (const sel of selectors) {
    const loc = page.locator(sel);
    if ((await loc.count()) > 0) {
      const first = loc.first();
      await first.fill(value);
      return true;
    }
  }
  return false;
}

async function tryClick(page, selectors) {
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel);
      if ((await loc.count()) > 0) {
        await loc.first().click();
        return true;
      }
    } catch (e) {
      // ignore and try next selector
    }
  }
  return false;
}

async function findFirstClickable(page, selectors) {
  for (const sel of selectors) {
    const loc = page.locator(sel);
    const count = await loc.count();
    if (count === 0) continue;
    for (let i = 0; i < count; i++) {
      const item = loc.nth(i);
      try {
        if (await item.isVisible() && await item.isEnabled()) {
          const box = await item.boundingBox();
          if (box && box.width > 2 && box.height > 2) return item;
        }
      } catch (e) {
        // continue
      }
    }
  }
  return null;
}

test('activate first inactive hospital (super admin)', async ({ page }) => {
  // 1. Go to login URL and click 'Login as Super Admin'
  await page.goto(BASE_LOGIN, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await tryClick(page, ['button:has-text("Login as Super Admin")', 'text=Login as Super Admin', 'a:has-text("Login as Super Admin")']);

  // wait for Auth0 login form
  try {
    await page.waitForSelector('input[id="1-email"]', { timeout: 10000 });
  } catch (e) {
    // fallback to other selectors
  }

  // 2. Fill credentials and click Login (prefer the Auth0 ids)
  const emailSelectors = [
    'input[id="1-email"]',
    '[id="1-email"]',
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="Email"]'
  ];
  const passSelectors = [
    'input[id="1-password"]',
    '[id="1-password"]',
    'input[type="password"]',
    'input[name="password"]',
  ];

  const filledEmail = await tryFill(page, emailSelectors, SA_EMAIL);
  expect(filledEmail).toBeTruthy();
  const filledPass = await tryFill(page, passSelectors, SA_PASSWORD);
  expect(filledPass).toBeTruthy();

  // click Auth0 login submit
  await tryClick(page, ['button[id="1-submit"]', '[id="1-submit"]', 'button.auth0-lock-submit', 'button:has-text("Log In")']);

  // 3. Wait for redirect back to app or for main container
  try {
    await page.waitForURL(/34\.234\.86\.155|http:\/\//, { timeout: 15000 });
  } catch (e) {
    // ignore
  }

  // Click Inactive toggle (use xpath priority plus data-state fallback)
  await tryClick(page, [
    'xpath=/html/body/div/main/main/div/div[2]/div/div[1]/div/div[1]/div/button[2]',
    'button[data-state="inactive"]',
    'button[aria-controls*="DEACTIVE"]',
    'button[id*="DEACTIVE"]',
    'button:has-text("Inactive")'
  ]);

  // Ensure Inactive tab is actually selected; click it directly if needed
  try {
    // Prefer semantic role lookup which tends to be more cross-browser stable
    const inactiveTab = page.getByRole ? page.getByRole('tab', { name: 'Inactive' }) : page.locator('button:has-text("Inactive")');
    if ((await inactiveTab.count()) > 0) {
      await inactiveTab.first().click({ force: true });
      // wait for aria-selected or selected class indicating active tab
      await page.waitForSelector('button:has-text("Inactive")[aria-selected="true"]', { timeout: 7000 }).catch(() => {});
    }
  } catch (e) {
    // ignore and continue; later waits will fail with assertion if nothing found
  }

  // 4. Find first inactive hospital row and click
  const listCandidates = [
    'table tbody tr',
    '[role="row"]',
    '.ant-table-row',
    '.hospital-list .row',
    'ul.inactive-list li',
    '.list-item',
    '.card.inactive',
    '[data-testid^="hospital"]'
  ];

  // wait for any of the candidate selectors briefly
  let found = false;
  for (const sel of listCandidates) {
    try {
      await page.waitForSelector(sel, { timeout: 20000 });
      found = true;
      break;
    } catch (e) {
      // try next
    }
  }

  expect(found).toBeTruthy();
  const firstHospital = await findFirstClickable(page, listCandidates);
  expect(firstHospital, 'No clickable hospital row found').not.toBeNull();

  const beforeText = await firstHospital.innerText();
  await firstHospital.click();

  // 5. Click Activate and confirm
  await tryClick(page, ['button:has-text("Activate")', 'text=Activate']);
  await page.waitForTimeout(400);
  const dialog = page.locator('role=dialog');
  if ((await dialog.count()) > 0) {
    const confirm = dialog.locator('button:has-text("Activate")');
    if ((await confirm.count()) > 0) await confirm.first().click();
  }

  // 6. Assert activation success: try to detect toast or row change
  const successSelectors = ['text=Activated', '.toast-success', '.ant-message-success', '.notification-success'];
  let ok = false;
  for (const sel of successSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 4000 });
      ok = true;
      break;
    } catch (e) {
      // continue
    }
  }

  if (!ok) {
    // check row text changed or no longer contains 'inactive'
    await page.waitForTimeout(1200);
    let afterText = '';
    try {
      // Re-query the first clickable hospital row because the DOM may have changed
      const newFirst = await findFirstClickable(page, listCandidates);
      if (newFirst) {
        afterText = await newFirst.innerText();
      } else {
        // fallback: try common table selector directly
        const fallback = page.locator('table tbody tr').first();
        if ((await fallback.count()) > 0) {
          afterText = await fallback.innerText().catch(() => '');
        }
      }
    } catch (e) {
      // ignore and leave afterText empty
    }
    if (beforeText && afterText && beforeText !== afterText) ok = true;
    if (afterText && !/inactive/i.test(afterText)) ok = true;
  }

  // Save artifacts for debugging whether success or failure
  const fs = require('fs');
  if (ok) {
    await page.screenshot({ path: 'MyCa/tests/success-screenshot.png', fullPage: true });
    fs.writeFileSync('MyCa/tests/success-page.html', await page.content(), 'utf8');
  } else {
    await page.screenshot({ path: 'MyCa/tests/failure-screenshot.png', fullPage: true });
    fs.writeFileSync('MyCa/tests/failure-page.html', await page.content(), 'utf8');
  }

  expect(ok, 'Activation was not confirmed by toast or row change').toBeTruthy();
});
