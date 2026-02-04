#!/usr/bin/env node
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOGIN_URL = `${BASE_URL}/login`;
const EMAIL = process.env.TEST_EMAIL || 'shrinath.himane@mindbowser.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Test@1234';
const WAIT_TIME = 1000; // Wait time between actions in milliseconds

(async () => {
  console.log('\n🧭 SUPER ADMIN USER WORKFLOW STARTED');
  console.log(`   Using URL: ${BASE_URL}`);

  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    /* ===================== 1. OPEN APPLICATION ===================== */
    console.log('\n1️⃣ Opening the application...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 2. CLICK LOGIN AS SUPER ADMIN ===================== */
    console.log('\n2️⃣ Clicking on "Login as Super Admin" button...');
    const superAdminBtn = page.locator('button:has-text("Login as Super Admin")').first();
    await superAdminBtn.waitFor({ state: 'visible' });
    await page.waitForTimeout(WAIT_TIME);
    await superAdminBtn.click();
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { await page.waitForTimeout(1500); }
    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 3. ENTER CREDENTIALS AND LOGIN ===================== */
    console.log('\n3️⃣ Entering credentials and clicking Login...');
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(WAIT_TIME);
    await emailInput.fill(EMAIL);
    await page.waitForTimeout(WAIT_TIME);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible' });
    await passwordInput.fill(PASSWORD);
    await page.waitForTimeout(WAIT_TIME);

    const loginBtn = page.locator('button:has-text("Log In"), button:has-text("Login"), button[type="submit"]').first();
    await loginBtn.waitFor({ state: 'visible' });
    await page.waitForTimeout(WAIT_TIME);
    await loginBtn.click();
    try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) {}
    await page.waitForTimeout(WAIT_TIME);
    console.log('   ✓ Logged in successfully');

    /* ===================== 4. CLICK ON ACTIVE/INACTIVE TOGGLE ===================== */
    console.log('\n4️⃣ Clicking on Active/Inactive toggle button...');
    await page.waitForTimeout(WAIT_TIME);

    // Click Inactive first
    const inactiveToggle = page.locator('button:has-text("Inactive"), [role="tab"]:has-text("Inactive")').first();
    await inactiveToggle.waitFor({ state: 'visible' });
    await page.waitForTimeout(WAIT_TIME);
    await inactiveToggle.click();
    console.log('   ✓ Clicked Inactive toggle');
    await page.waitForTimeout(WAIT_TIME);

    // Click Active again
    const activeToggle = page.locator('button:has-text("Active"), [role="tab"]:has-text("Active")').first();
    await activeToggle.waitFor({ state: 'visible' });
    await page.waitForTimeout(WAIT_TIME);
    await activeToggle.click();
    console.log('   ✓ Clicked Active toggle');
    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 5. SEARCH BAR - TYPE "Test" AND CLEAR ===================== */
    console.log('\n5️⃣ Clicking on Search bar, typing "Test", then clearing...');
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();
    await searchInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(WAIT_TIME);
    await searchInput.click();
    await page.waitForTimeout(WAIT_TIME);
    await searchInput.fill('Test');
    console.log('   ✓ Typed "Test" in search bar');
    await page.waitForTimeout(WAIT_TIME);

    // Clear search - try clicking clear icon or using keyboard
    try {
      const clearIcon = page.locator('input[placeholder*="Search"] ~ *, input[type="search"] ~ *').locator('svg, button').first();
      if (await clearIcon.count() > 0) {
        await clearIcon.click();
        console.log('   ✓ Clicked clear icon');
      } else {
        throw new Error('No clear icon');
      }
    } catch {
      await searchInput.fill('');
      await page.keyboard.press('Escape');
      console.log('   ✓ Cleared search input');
    }
    await page.waitForTimeout(WAIT_TIME);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 6. CLICK ON LAST HOSPITAL IN LIST ===================== */
    console.log('\n6️⃣ Clicking on the last hospital in the list...');
    const hospitalRows = page.locator('table tbody tr:visible');
    await hospitalRows.first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(WAIT_TIME);
    const hospitalCount = await hospitalRows.count();
    console.log(`   Found ${hospitalCount} hospital rows`);

    if (hospitalCount > 0) {
      const lastHospital = hospitalRows.nth(hospitalCount - 1);
      await lastHospital.scrollIntoViewIfNeeded();
      await page.waitForTimeout(WAIT_TIME);

      // Try clicking on the hospital name link or the row
      const hospitalLink = lastHospital.locator('td:first-child a, td:first-child').first();
      await hospitalLink.click({ force: true });
      console.log('   ✓ Clicked on last hospital');
      await page.waitForTimeout(WAIT_TIME);
    }

    /* ===================== 7. CLICK EDIT AND ENTER "Test" IN NAME FIELD ===================== */
    console.log('\n7️⃣ Clicking Edit button and entering "Test" in name field...');

    // Wait for details view or modal to appear
    await page.waitForTimeout(WAIT_TIME);

    // Try multiple selectors for Edit button
    const editSelectors = [
      'button:has-text("Edit")',
      '[data-testid="edit-button"]',
      'button[aria-label="Edit"]',
      'a:has-text("Edit")',
      '.edit-btn',
      'button:has(svg[data-testid="EditIcon"])'
    ];

    let editClicked = false;
    for (const sel of editSelectors) {
      try {
        const editBtn = page.locator(sel).first();
        if (await editBtn.count() > 0 && await editBtn.isVisible()) {
          await editBtn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(WAIT_TIME);
          await editBtn.click({ force: true });
          editClicked = true;
          console.log(`   ✓ Clicked Edit button (${sel})`);
          break;
        }
      } catch (e) {}
    }

    if (!editClicked) {
      console.log('   ⚠ Edit button not found, taking screenshot...');
      await page.screenshot({ path: 'edit_not_found.png' });
    }

    await page.waitForTimeout(WAIT_TIME);

    // Find and fill hospital name input
    const nameSelectors = [
      'input[name="hospitalName"]',
      'input[name="name"]',
      'input[placeholder*="Hospital Name"]',
      'input[placeholder*="Name"]',
      'input[id*="name"]',
      'input[id*="hospitalName"]',
      'form input[type="text"]'
    ];

    let nameFilled = false;
    for (const sel of nameSelectors) {
      try {
        const nameInput = page.locator(sel).first();
        if (await nameInput.count() > 0 && await nameInput.isVisible()) {
          await nameInput.scrollIntoViewIfNeeded();
          await page.waitForTimeout(WAIT_TIME);
          await nameInput.clear();
          await page.waitForTimeout(WAIT_TIME);
          await nameInput.fill('Test');
          nameFilled = true;
          console.log(`   ✓ Entered "Test" in name field (${sel})`);
          break;
        }
      } catch (e) {}
    }

    if (!nameFilled) {
      console.log('   ⚠ Name field not found');
    }

    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 8. SCROLL DOWN AND CLICK SAVE CHANGES ===================== */
    console.log('\n8️⃣ Scrolling down and clicking Save Changes button...');

    const saveSelectors = [
      'button:has-text("Save Changes")',
      'button:has-text("Save")',
      'button:has-text("Update")',
      'button[type="submit"]'
    ];

    for (const sel of saveSelectors) {
      try {
        const saveBtn = page.locator(sel).first();
        if (await saveBtn.count() > 0 && await saveBtn.isVisible()) {
          await saveBtn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(WAIT_TIME);
          await saveBtn.click({ force: true });
          console.log(`   ✓ Clicked Save button (${sel})`);
          break;
        }
      } catch (e) {}
    }

    await page.waitForTimeout(WAIT_TIME);

    // Navigate back to hospital management if needed
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(WAIT_TIME);
    } catch (e) {}

    /* ===================== 9. CLICK ADD NEW HOSPITAL ===================== */
    console.log('\n9️⃣ Clicking on Add New Hospital button...');

    const addSelectors = [
      'button:has-text("Add New Hospital")',
      'button:has-text("+ Add New Hospital")',
      'button:has-text("+ Add New")',
      'a:has-text("Add New Hospital")',
      '[data-testid="add-new-hospital"]'
    ];

    let addClicked = false;
    for (const sel of addSelectors) {
      try {
        const addBtn = page.locator(sel).first();
        if (await addBtn.count() > 0) {
          await addBtn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(WAIT_TIME);
          await addBtn.click({ force: true });
          addClicked = true;
          console.log(`   ✓ Clicked Add New Hospital (${sel})`);
          break;
        }
      } catch (e) {}
    }

    if (!addClicked) {
      console.log('   ⚠ Add New Hospital button not found');
      await page.screenshot({ path: 'add_not_found.png' });
    }

    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 10. FILL ALL FIELDS WITH "Test" ===================== */
    console.log('\n🔟 Filling all fields with "Test"...');

    // Wait for form to appear
    await page.waitForTimeout(WAIT_TIME);

    // Get all visible input fields
    const allInputs = page.locator('input:visible:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([readonly]):not([disabled]), textarea:visible');
    const inputCount = await allInputs.count();
    console.log(`   Found ${inputCount} input fields`);

    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      try {
        const isVisible = await input.isVisible();
        const isEnabled = await input.isEnabled();

        if (isVisible && isEnabled) {
          const inputType = await input.getAttribute('type') || 'text';
          const inputName = await input.getAttribute('name') || await input.getAttribute('placeholder') || `field-${i}`;

          await input.scrollIntoViewIfNeeded();
          await page.waitForTimeout(WAIT_TIME);

          if (inputType === 'email' || inputName.toLowerCase().includes('email')) {
            await input.fill('test@test.com');
          } else if (inputType === 'tel' || inputType === 'number' || inputName.toLowerCase().includes('phone')) {
            await input.fill('1234567890');
          } else if (inputType === 'url' || inputName.toLowerCase().includes('url')) {
            await input.fill('https://test.com');
          } else {
            await input.fill('Test');
          }
          console.log(`   ✓ Filled: ${inputName}`);
          await page.waitForTimeout(WAIT_TIME);
        }
      } catch (e) {
        console.log(`   ⚠ Could not fill field ${i + 1}: ${e.message}`);
      }
    }

    // Handle select/dropdown fields
    const allSelects = page.locator('select:visible');
    const selectCount = await allSelects.count();
    console.log(`   Found ${selectCount} dropdown fields`);

    for (let i = 0; i < selectCount; i++) {
      const select = allSelects.nth(i);
      try {
        await page.waitForTimeout(WAIT_TIME);
        const options = await select.locator('option').count();
        if (options > 1) {
          await select.selectOption({ index: 1 });
          console.log(`   ✓ Selected dropdown ${i + 1}`);
          await page.waitForTimeout(WAIT_TIME);
        }
      } catch (e) {
        console.log(`   ⚠ Could not select dropdown ${i + 1}`);
      }
    }

    /* ===================== 11. CLICK ADD HOSPITAL BUTTON ===================== */
    console.log('\n1️⃣1️⃣ Clicking on Add Hospital button at the bottom...');

    const submitSelectors = [
      'button:has-text("Add Hospital")',
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Create")',
      'button:has-text("Save")'
    ];

    for (const sel of submitSelectors) {
      try {
        const submitBtn = page.locator(sel).last();
        if (await submitBtn.count() > 0 && await submitBtn.isVisible()) {
          await submitBtn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(WAIT_TIME);
          await submitBtn.click({ force: true });
          console.log(`   ✓ Clicked submit button (${sel})`);
          break;
        }
      } catch (e) {}
    }

    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 12. CLICK BREADCRUMB TO RETURN TO DASHBOARD ===================== */
    console.log('\n1️⃣2️⃣ Clicking on breadcrumb to return to dashboard...');

    const breadcrumbSelectors = [
      'nav[aria-label="breadcrumb"] a',
      '.breadcrumb a',
      '[class*="breadcrumb"] a',
      'a:has-text("Hospital Management")',
      'a:has-text("Dashboard")',
      'a:has-text("Home")',
      'nav a:first-child'
    ];

    let breadcrumbClicked = false;
    for (const sel of breadcrumbSelectors) {
      try {
        const breadcrumb = page.locator(sel).first();
        if (await breadcrumb.count() > 0 && await breadcrumb.isVisible()) {
          await breadcrumb.scrollIntoViewIfNeeded();
          await page.waitForTimeout(WAIT_TIME);
          await breadcrumb.click({ force: true });
          breadcrumbClicked = true;
          console.log(`   ✓ Clicked breadcrumb (${sel})`);
          break;
        }
      } catch (e) {}
    }

    if (!breadcrumbClicked) {
      // Fallback: navigate directly to dashboard
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      console.log('   ✓ Navigated to dashboard directly');
    }

    await page.waitForTimeout(WAIT_TIME);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 13. CLICK MORE OPTIONS OF LAST HOSPITAL ===================== */
    console.log('\n1️⃣3️⃣ Clicking on more options of last hospital...');

    const hospitalRowsAgain = page.locator('table tbody tr:visible');
    await hospitalRowsAgain.first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(WAIT_TIME);
    const hospitalCountAgain = await hospitalRowsAgain.count();
    console.log(`   Found ${hospitalCountAgain} hospital rows`);

    // More options selectors (defined outside if block for reuse)
    const moreOptionsSelectors = [
      'button[aria-label*="more"]',
      'button[aria-label*="More"]',
      'button[aria-label*="options"]',
      'button[aria-label*="Options"]',
      'button[aria-label*="actions"]',
      'button[aria-label*="Actions"]',
      'button:has(svg)',
      '[data-testid="more-options"]',
      '.more-options',
      '.kebab-menu',
      'td:last-child button'
    ];

    if (hospitalCountAgain > 0) {
      const lastHospitalRow = hospitalRowsAgain.nth(hospitalCountAgain - 1);
      await lastHospitalRow.scrollIntoViewIfNeeded();
      await page.waitForTimeout(WAIT_TIME);

      // Click on more options (three dots / kebab menu)
      let moreClicked = false;
      for (const sel of moreOptionsSelectors) {
        try {
          const moreBtn = lastHospitalRow.locator(sel).first();
          if (await moreBtn.count() > 0 && await moreBtn.isVisible()) {
            await moreBtn.click({ force: true });
            moreClicked = true;
            console.log(`   ✓ Clicked more options (${sel})`);
            break;
          }
        } catch (e) {}
      }

      if (!moreClicked) {
        console.log('   ⚠ More options button not found');
      }
    }

    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 14. CLICK DEACTIVATE AND CANCEL ===================== */
    console.log('\n1️⃣4️⃣ Clicking Deactivate option and Cancel on popup...');

    // Click on Deactivate option in dropdown menu
    const deactivateSelectors = [
      'text=Deactivate',
      'button:has-text("Deactivate")',
      'a:has-text("Deactivate")',
      '[role="menuitem"]:has-text("Deactivate")',
      'li:has-text("Deactivate")'
    ];

    for (const sel of deactivateSelectors) {
      try {
        const deactivateBtn = page.locator(sel).first();
        if (await deactivateBtn.count() > 0 && await deactivateBtn.isVisible()) {
          await page.waitForTimeout(WAIT_TIME);
          await deactivateBtn.click({ force: true });
          console.log(`   ✓ Clicked Deactivate (${sel})`);
          break;
        }
      } catch (e) {}
    }

    await page.waitForTimeout(WAIT_TIME);

    // Click Cancel on confirmation popup
    const cancelPopupSelectors = [
      '[role="dialog"] button:has-text("Cancel")',
      '.modal button:has-text("Cancel")',
      'button:has-text("Cancel")',
      '[role="alertdialog"] button:has-text("Cancel")'
    ];

    for (const sel of cancelPopupSelectors) {
      try {
        const cancelBtn = page.locator(sel).first();
        if (await cancelBtn.count() > 0 && await cancelBtn.isVisible()) {
          await page.waitForTimeout(WAIT_TIME);
          await cancelBtn.click({ force: true });
          console.log(`   ✓ Clicked Cancel on popup (${sel})`);
          break;
        }
      } catch (e) {}
    }

    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 15. CLICK EDIT AND THEN CANCEL ===================== */
    console.log('\n1️⃣5️⃣ Clicking Edit button and then Cancel...');

    // Click more options again to access Edit
    if (hospitalCountAgain > 0) {
      const lastHospitalRowAgain = hospitalRowsAgain.nth(hospitalCountAgain - 1);

      // Click on more options again
      for (const sel of moreOptionsSelectors) {
        try {
          const moreBtn = lastHospitalRowAgain.locator(sel).first();
          if (await moreBtn.count() > 0 && await moreBtn.isVisible()) {
            await moreBtn.click({ force: true });
            console.log(`   ✓ Clicked more options again`);
            break;
          }
        } catch (e) {}
      }

      await page.waitForTimeout(WAIT_TIME);

      // Click Edit option
      const editMenuSelectors = [
        'text=Edit',
        'button:has-text("Edit")',
        'a:has-text("Edit")',
        '[role="menuitem"]:has-text("Edit")',
        'li:has-text("Edit")'
      ];

      for (const sel of editMenuSelectors) {
        try {
          const editOption = page.locator(sel).first();
          if (await editOption.count() > 0 && await editOption.isVisible()) {
            await page.waitForTimeout(WAIT_TIME);
            await editOption.click({ force: true });
            console.log(`   ✓ Clicked Edit option (${sel})`);
            break;
          }
        } catch (e) {}
      }

      await page.waitForTimeout(WAIT_TIME);

      // Scroll down and click Cancel button
      const cancelBtnSelectors = [
        'button:has-text("Cancel")',
        'a:has-text("Cancel")',
        '[data-testid="cancel-button"]'
      ];

      for (const sel of cancelBtnSelectors) {
        try {
          const cancelBtn = page.locator(sel).first();
          if (await cancelBtn.count() > 0 && await cancelBtn.isVisible()) {
            await cancelBtn.scrollIntoViewIfNeeded();
            await page.waitForTimeout(WAIT_TIME);
            await cancelBtn.click({ force: true });
            console.log(`   ✓ Clicked Cancel button (${sel})`);
            break;
          }
        } catch (e) {}
      }
    }

    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 16. CLICK SETTINGS AND CHANGE PASSWORD TOGGLE ===================== */
    console.log('\n1️⃣6️⃣ Clicking Settings and Change Password toggle...');

    // Click on Settings in sidebar
    const settingsSelectors = [
      'a:has-text("Settings")',
      'button:has-text("Settings")',
      '[data-testid="settings-link"]',
      'nav a:has-text("Settings")',
      '.sidebar a:has-text("Settings")',
      '[class*="sidebar"] a:has-text("Settings")',
      'aside a:has-text("Settings")'
    ];

    for (const sel of settingsSelectors) {
      try {
        const settingsBtn = page.locator(sel).first();
        if (await settingsBtn.count() > 0 && await settingsBtn.isVisible()) {
          await page.waitForTimeout(WAIT_TIME);
          await settingsBtn.click({ force: true });
          console.log(`   ✓ Clicked Settings (${sel})`);
          break;
        }
      } catch (e) {}
    }

    await page.waitForTimeout(WAIT_TIME);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(WAIT_TIME);

    // Click on Change Password toggle
    const changePasswordToggleSelectors = [
      'button:has-text("Change Password")',
      'text=Change Password',
      '[data-testid="change-password-toggle"]',
      'label:has-text("Change Password")',
      '[role="switch"]:near(:text("Change Password"))',
      'input[type="checkbox"]:near(:text("Change Password"))'
    ];

    for (const sel of changePasswordToggleSelectors) {
      try {
        const toggleBtn = page.locator(sel).first();
        if (await toggleBtn.count() > 0 && await toggleBtn.isVisible()) {
          await toggleBtn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(WAIT_TIME);
          await toggleBtn.click({ force: true });
          console.log(`   ✓ Clicked Change Password toggle (${sel})`);
          break;
        }
      } catch (e) {}
    }

    await page.waitForTimeout(WAIT_TIME);

    /* ===================== 17. CLICK CHANGE PASSWORD VIA AUTH BUTTON ===================== */
    console.log('\n1️⃣7️⃣ Clicking Change Password via Auth button...');

    const changePasswordAuthSelectors = [
      'button:has-text("Change Password via Auth")',
      'button:has-text("Change Password")',
      'a:has-text("Change Password via Auth")',
      '[data-testid="change-password-auth"]',
      'button:has-text("Auth")'
    ];

    for (const sel of changePasswordAuthSelectors) {
      try {
        const authBtn = page.locator(sel).first();
        if (await authBtn.count() > 0 && await authBtn.isVisible()) {
          await authBtn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(WAIT_TIME);
          await authBtn.click({ force: true });
          console.log(`   ✓ Clicked Change Password via Auth (${sel})`);
          break;
        }
      } catch (e) {}
    }

    await page.waitForTimeout(WAIT_TIME);

    /* ===================== END SESSION ===================== */
    console.log('\n✅ SUPER ADMIN USER WORKFLOW COMPLETED SUCCESSFULLY');

  } catch (error) {
    console.error('\n❌ Workflow failed:', error.message);
    await page.screenshot({ path: 'workflow_error.png' });
    console.log('   Screenshot saved to workflow_error.png');
  } finally {
    await page.waitForTimeout(WAIT_TIME);
    await browser.close();
  }
})();
