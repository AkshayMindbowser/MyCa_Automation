const { chromium } = require('playwright');

(async () => {
	const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
	const context = await browser.newContext({ viewport: null });
	const page = await context.newPage();

	async function waitForVisible(page, selector, timeout = 30000) {
		try {
			const el = page.locator(selector);
			await el.waitFor({ state: 'visible', timeout });
			return el;
		} catch (e) {
			return null;
		}
	}

	async function tryClick(page, selectors, options = { timeout: 30000 }) {
		for (const sel of selectors) {
			try {
					const el = await waitForVisible(page, sel, options.timeout);
					if (el) {
						try {
							await el.scrollIntoViewIfNeeded();
							await el.click();
						} catch (e) {
							// Try a JS click as a fallback
							try {
								await page.evaluate((s) => {
									const node = document.querySelector(s);
									if (node) node.click();
								}, sel).catch(() => {});
							} catch (e) {}
						}
						return true;
					}
			} catch (e) {
				// ignore and try next
			}
		}
		return false;
	}

		async function clickByQuerySelectorJS(page, query) {
			try {
				await page.evaluate((q) => {
					const el = document.querySelector(q);
					if (el) {
						el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
						el.click();
					}
				}, query);
				return true;
			} catch (e) { return false; }
		}

	try {
		const url = 'http://34.234.86.155:3000/login';
		await page.goto(url);
		await page.waitForLoadState('networkidle');

		// click Login as Super Admin
		const loginBtn = await waitForVisible(page, 'text=Login as Super Admin', 30000);
		if (!loginBtn) throw new Error('Login as Super Admin button not found');
		await loginBtn.click();

		// Wait for Auth0 form
		let authVisible = false;
		for (let i = 0; i < 5; i++) {
			const emailInput = await waitForVisible(page, 'input[id="1-email"]', 8000);
			if (emailInput) {
				authVisible = true;
				break;
			}
			await page.waitForTimeout(1000);
		}
		if (!authVisible) throw new Error('Auth0 login form not visible');

		const email = process.env.SUPERADMIN_EMAIL || 'shrinath.himane@mindbowser.com';
		const password = process.env.SUPERADMIN_PASSWORD || 'Test@1234';

		if (!(await waitForVisible(page, 'input[id="1-email"]', 5000))) throw new Error('Email input missing');
		await page.fill('input[id="1-email"]', email);
		if (!(await waitForVisible(page, 'input[id="1-password"]', 5000))) throw new Error('Password input missing');
		await page.fill('input[id="1-password"]', password);

		// submit
		await tryClick(page, ['button[id="1-submit"]', 'button:has-text("Log In")', 'button:has-text("Continue")'], { timeout: 8000 });

		// Wait for Hospital Management or dashboard
		let loaded = false;
		for (let i = 0; i < 6; i++) {
			await page.waitForLoadState('networkidle');
			if (await waitForVisible(page, 'text=Hospital Management', 5000)) { loaded = true; break; }
			if (await waitForVisible(page, 'text=Active', 3000)) { loaded = true; break; }
			await page.waitForTimeout(1000);
		}
			if (!loaded) {
				console.warn('Warning: Hospital Management page not detected within timeout — continuing to attempt logout (page may still be loading)');
			}

			// Wait a short moment for UI to stabilize
			await page.waitForTimeout(3000);

		// Try to click the Logout element using SVG locator strategies (include exact classes from provided SVG)
		const logoutSelectors = [
			'button:has(svg.lucide.lucide-log-out.text-red-600)',
			'svg.lucide.lucide-log-out.text-red-600',
			'button:has(svg[class*="text-red-600"])',
			'button:has(svg.lucide-log-out)',
			'button:has(svg[class*="log-out"])',
			'a:has(svg.lucide-log-out)',
			'svg.lucide-log-out',
			'svg[class*="log-out"]',
			'button:has-text("Logout")',
			'text=Logout'
		];

			// Try multiple times to click logout (UI may take time to hydrate)
			let clicked = false;
			for (let i = 0; i < 5; i++) {
				clicked = await tryClick(page, logoutSelectors, { timeout: 5000 });
				if (clicked) break;
				// Try a JS query selector click fallback
				clicked = await clickByQuerySelectorJS(page, 'button:has(span:has-text("Logout"))');
				if (clicked) break;
				clicked = await clickByQuerySelectorJS(page, 'button:has(svg.lucide-log-out)');
				if (clicked) break;
				await page.waitForTimeout(800);
			}

				// Final explicit XPath fallback provided by user
				if (!clicked) {
					try {
						const xpathButton = '/html/body/div[3]/div/div[4]/ul/li/button';
						const btn = page.locator(`xpath=${xpathButton}`);
						if ((await btn.count()) > 0) {
							try {
								await btn.first().scrollIntoViewIfNeeded();
								await btn.first().click({ timeout: 3000 });
								clicked = true;
							} catch (e) {
								// JS evaluate fallback using document.evaluate
								await page.evaluate((xp) => {
									const res = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
									const node = res.singleNodeValue;
									if (node) {
										// if svg provided, click parent button
										const toClick = node.tagName.toLowerCase() === 'button' ? node : (node.closest('button') || node);
										toClick && toClick.click();
									}
								}, xpathButton).catch(() => {});
								clicked = true;
							}
						}
					} catch (e) {
						// ignore
					}
				}

			// If still not clicked, capture targeted artifacts for debugging and fail
			if (!clicked) {
				try {
					await page.screenshot({ path: 'logout_svg_missing.png', fullPage: true });
					const fs = require('fs');
					fs.writeFileSync('logout_svg_missing.html', await page.content(), 'utf8');
				} catch (e) { /* ignore capture errors */ }
				throw new Error('Logout SVG/button not found or not clickable after multiple strategies (see logout_svg_missing.png/html)');
			}

		// Wait to see if logged out (look for login landing)
		let loggedOut = false;
		for (let i = 0; i < 6; i++) {
			if (await page.locator('text=Login as Super Admin').count() > 0) { loggedOut = true; break; }
			await page.waitForTimeout(1000);
		}

		await page.screenshot({ path: 'logout_result.png', fullPage: true });
		const fs = require('fs');
		fs.writeFileSync('logout_result.html', await page.content());

		if (!loggedOut) throw new Error('Logout may have failed - Login button not visible after click');

		console.log('Logout clicked and login page visible. Success.');
		await browser.close();
	} catch (err) {
		console.error('Logout script failed:', err.message || err);
		try { await page.screenshot({ path: 'logout_error.png', fullPage: true }); const fs = require('fs'); fs.writeFileSync('logout_error.html', await page.content()); } catch (e) {}
		try { await browser.close(); } catch (e) {}
		process.exit(1);
	}
})();
