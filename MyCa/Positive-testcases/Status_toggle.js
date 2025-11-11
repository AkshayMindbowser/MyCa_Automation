(async () => {
	const { chromium } = require('playwright');
	const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
	const context = await browser.newContext({ viewport: null });
	const page = await context.newPage();

	try {
		// Login (reuse same credentials used elsewhere)
		await page.goto('http://34.234.86.155:3000/login');
		await page.waitForLoadState('networkidle');
		await page.waitForSelector('text=Login as Super Admin', { state: 'visible' });
		await page.click('text=Login as Super Admin');
		await page.fill('xpath=//input[@id="1-email"]', 'shrinath.himane@mindbowser.com');
		await page.fill('xpath=//input[@id="1-password"]', 'Test@1234');
		await page.click('xpath=//span[@class="auth0-label-submit"]');

		// Wait for app to settle
		await page.waitForTimeout(3000);

		// Helper to click status button by visible text (case-insensitive)
		const clickStatus = async (text, timeout = 5000) => {
			const t = text.toLowerCase();
			// Try simple text selector first
			try {
				await page.waitForSelector(`text=${text}`, { state: 'visible', timeout });
				await page.click(`text=${text}`);
				console.log(`Clicked status button: ${text}`);
				return true;
			} catch (e) {
				// fallback: locate any button whose innerText contains the text (case-insensitive)
				try {
					const handle = await page.evaluateHandle((t) => {
						const buttons = Array.from(document.querySelectorAll('button'));
						return buttons.find(b => b.innerText && b.innerText.toLowerCase().includes(t)) || null;
					}, t);
					if (handle && handle.asElement()) {
						await page.evaluate(el => el.click(), handle);
						console.log(`Clicked status button via DOM-search: ${text}`);
						return true;
					}
				} catch (err) {
					// ignore
				}
			}
			return false;
		};

		// 1) Default is 'Active' — wait 3s then click 'Inactive'
		console.log('Waiting 3s before clicking Inactive...');
		await page.waitForTimeout(3000);
		const clickedInactive = await clickStatus('Inactive', 4000);
		if (!clickedInactive) {
			console.error('Failed to find/click Inactive button. Saving debug snapshot.');
			await page.screenshot({ path: 'status_inactive_not_found.png', fullPage: true });
			const fs = require('fs');
			fs.writeFileSync('status_inactive_not_found.html', await page.content());
			await browser.close();
			process.exit(1);
		}

		// 2) Wait for 3 seconds then wait for Active button to reappear and click it
		console.log('Clicked Inactive. Waiting 3s before waiting for Active...');
		await page.waitForTimeout(3000);

		// Now wait up to 10s for 'Active' to be visible, then click it
		const clickedActive = await clickStatus('Active', 10000);
		if (!clickedActive) {
			console.error('Failed to find/click Active button after toggling. Saving debug snapshot.');
			await page.screenshot({ path: 'status_active_not_found.png', fullPage: true });
			const fs = require('fs');
			fs.writeFileSync('status_active_not_found.html', await page.content());
			await browser.close();
			process.exit(1);
		}

		console.log('Status toggle flow completed successfully.');
		await page.waitForTimeout(1000);
		await browser.close();
	} catch (err) {
		console.error('Script failed:', err);
		try { await browser.close(); } catch {};
		process.exit(1);
	}
})();

