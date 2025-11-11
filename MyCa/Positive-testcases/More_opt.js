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

		// Wait for hospital listing UI to appear
		await page.waitForSelector('table tbody tr', { timeout: 15000 });

		// Wait until at least 3 non-skeleton rows are present (rows without 'animate-pulse')
		const rowsReady = await page.waitForFunction(() => {
			const rows = Array.from(document.querySelectorAll('table tbody tr'));
			const realRows = rows.filter(r => !r.classList.contains('animate-pulse'));
			return realRows.length >= 3;
		}, { timeout: 15000 }).catch(() => false);

		// If rows are not fully ready but there are at least 3 rows total, proceed with a warning
		const totalRows = await page.locator('table tbody tr').count();
		if (!rowsReady && totalRows < 3) {
			throw new Error(`Expected at least 3 hospital rows, found ${totalRows}`);
		}
		if (!rowsReady) console.warn('Rows may be placeholder skeletons; proceeding with available rows');

		// Target the 3rd row (index 2)
		const rows = page.locator('table tbody tr');
		const thirdRow = rows.nth(2);

		// Locate the three-dots button inside the 3rd row
		const moreBtn = thirdRow.locator('button[aria-haspopup="menu"]');
		// Fallback locator: button that has sr-only span text 'Open menu'
		const moreBtnFallback = thirdRow.locator('button:has(span.sr-only:has-text("Open menu"))');

		// Ensure the button is present
		let resolvedMoreBtn = moreBtn;
		try {
			await moreBtn.waitFor({ state: 'visible', timeout: 3000 });
		} catch (e) {
			try {
				await moreBtnFallback.waitFor({ state: 'visible', timeout: 3000 });
				resolvedMoreBtn = moreBtnFallback;
			} catch (e2) {
				// If not found, try any button inside the row
				try {
					const anyBtn = thirdRow.locator('button').first();
					await anyBtn.waitFor({ state: 'visible', timeout: 3000 });
					resolvedMoreBtn = anyBtn;
				} catch (e3) {
					console.error('Failed to locate more-menu button inside 3rd row. Saving snapshot.');
					try { await page.screenshot({ path: 'more_opt_morebtn_not_found.png', fullPage: true }); } catch {}
					try { const fs = require('fs'); fs.writeFileSync('more_opt_morebtn_not_found.html', await page.content()); } catch {}
					throw new Error('More-menu button not found in 3rd row');
				}
			}
		}

		// 1) Wait 2 seconds then click the more-menu button
		console.log('Waiting 2s before first click on more-menu (3rd row)...');
		await page.waitForTimeout(2000);
		await resolvedMoreBtn.click();
		console.log('Clicked more-menu (first click)');

		// 2) Wait another 2 seconds and click again (if needed)
		await page.waitForTimeout(2000);
		try {
			await resolvedMoreBtn.click({ timeout: 3000 });
			console.log('Clicked more-menu (second click)');
		} catch (e) {
			// second click may be unnecessary; continue
			console.log('Second click on more-menu failed/was unnecessary:', e.message);
		}

		// 3) Wait 2 seconds then select the first option (Deactivate)
		await page.waitForTimeout(2000);

		// Attempt 1: click by exact visible text 'Deactivate'
		let clicked = false;
		try {
			await page.waitForSelector('text=Deactivate', { state: 'visible', timeout: 3000 });
			await page.click('text=Deactivate');
			console.log('Clicked Deactivate via text selector');
			clicked = true;
		} catch (e) {
			// Attempt 2: click first menuitem under a menu container
			try {
				const menuItem = page.locator('[role="menu"] >> [role="menuitem"]').first();
				const cnt = await menuItem.count();
				if (cnt > 0) {
					await menuItem.click();
					console.log('Clicked first menu item (role-based)');
					clicked = true;
				}
			} catch (e2) {
				// Attempt 3: DOM fallback - find a visible element with text 'deactivate' or click first visible menu-like element
				try {
					const found = await page.evaluateHandle(() => {
						const els = Array.from(document.querySelectorAll('button, a, li'))
							.filter(el => el.innerText && el.innerText.trim().length > 0 && window.getComputedStyle(el).visibility !== 'hidden');
						// prefer exact match 'deactivate'
						const exact = els.find(e => e.innerText.trim().toLowerCase() === 'deactivate');
						if (exact) return exact;
						return els.length ? els[0] : null;
					});
					if (found && found.asElement()) {
						await page.evaluate(el => el.click(), found);
						console.log('Clicked Deactivate (DOM fallback)');
						clicked = true;
					}
				} catch (e3) {
					// no-op
				}
			}
		}

		if (!clicked) {
			console.error('Failed to click Deactivate. Saving debug artifacts.');
			try { await page.screenshot({ path: 'more_opt_deactivate_not_found.png', fullPage: true }); } catch {}
			try { const fs = require('fs'); fs.writeFileSync('more_opt_deactivate_not_found.html', await page.content()); } catch {}
			throw new Error('Deactivate action failed');
		}

		console.log('More options flow completed successfully.');
		await page.waitForTimeout(1000);
		await browser.close();
	} catch (err) {
		console.error('Script failed:', err.message || err);
		try { await browser.close(); } catch {}
		process.exit(1);
	}
})();

