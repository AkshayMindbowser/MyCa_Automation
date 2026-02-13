# MyCa Automation — Playwright POM (JavaScript)

This repository is a Playwright automation framework using the Page Object Model (POM) pattern in JavaScript. It includes converted test suites (51+ test cases) organized by feature.

## Configuration

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
BASE_URL=http://localhost:3000        # Your app URL
TEST_EMAIL=user@example.com           # Admin email for login
TEST_PASSWORD=your_secure_password    # Admin password
HEADLESS=true                         # Run in headless mode (true/false)
BROWSER=chromium                      # Browser type (chromium/firefox/webkit)
```

**Important:** 
- `.env` is excluded from git (in `.gitignore`) to protect credentials
- Each developer should create their own `.env` file locally
- Credentials are centrally managed in `config/testConfig.js`
- All tests automatically load configuration from this file

### How Credentials Work

1. **Storing Credentials:**
   - Edit `.env` file in project root
   - Add your credentials (email, password, URLs)
   - File is private and never committed to version control

2. **Accessing Credentials in Tests:**
   ```javascript
   const config = require('../config/testConfig');
   const email = config.testEmail;
   const password = config.testPassword;
   const baseUrl = config.baseUrl;
   ```

3. **Environment-Specific Setup:**
   - Local development: Create `.env` locally
   - CI/CD pipelines: Set environment variables in runner
   - Example for GitHub Actions:
     ```yaml
     env:
       BASE_URL: http://localhost:3000
       TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
       TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
     ```

## Quick start

1. Install dependencies:

```bash
npm install
```

2. (Postinstall) Playwright browsers will be installed automatically by the `postinstall` script. If needed, run:

```bash
npx playwright install
```

3. Run all tests:

```bash
npm test
```

4. Run a specific test suite:

```bash
npx playwright test tests/auth.spec.js
npx playwright test tests/hospitals.spec.js
npx playwright test tests/validation.spec.js
npx playwright test tests/authConfig.spec.js
```

5. Run with headed browser:

```bash
npm run test:headed
```

6. Debug mode:

```bash
npm run test:debug
```

## Project Structure

```
pages/
  ├── base.page.js              # Base page with common methods
  ├── login.page.js             # Login page (local + Auth0)
  ├── auth0.page.js             # Auth0 authentication page
  ├── hospitals.page.js         # Hospitals list & interactions
  └── hospitalForm.page.js      # Hospital form creation

tests/
  ├── auth.spec.js              # Authentication & login (5 tests)
  ├── hospitals.spec.js         # Hospital management (10 tests)
  ├── validation.spec.js        # Form field validation (6 tests)
  ├── authConfig.spec.js        # Auth configuration (8 tests)
  ├── fileUpload.spec.js        # Image & file upload (6 tests)
  ├── login.spec.js             # Example login test
  └── converted/                # Converted/generated specs

tools/
  ├── convert_tests_to_pom.js   # Generates skeleton POM specs
  └── auto_convert_to_pom.js    # Auto-converts with pattern detection

playwright.config.js            # Playwright Test configuration
package.json                    # Dependencies & scripts
```

## Test Coverage

The framework covers 35+ test scenarios across:

- **Authentication** — Login, logout, case sensitivity, unregistered users
- **Hospital Management** — Create, list, view details, toggle status, duplicate detection
- **Form Validation** — Email, password, phone, description, required fields
- **Auth Configuration** — Provider config, client ID, issuer/tenant/audience URLs
- **File Upload** — Image selection, file size validation, icon preview

## Environment Variables

Set these to customize test runs:

```bash
export BASE_URL=http://your-app:3000       # Default: http://34.234.86.155:3000
export TEST_EMAIL=user@domain.com          # Admin email
export TEST_PASSWORD=your_password         # Admin password
```

## How to Convert Existing Tests

If you have standalone Playwright scripts, use the converter tools:

```bash
# Generate skeletons (basic structure with imports)
node tools/convert_tests_to_pom.js

# Generate fuller specs with pattern detection
node tools/auto_convert_to_pom.js
```

The auto-converter detects patterns (login, Add Hospital, logout, etc.) and generates POM-based test stubs.
Refine generated tests manually based on your original scripts.

## Page Object Model Pattern

Each page extends `BasePage` and encapsulates:

- **Selectors** — CSS/XPath locators
- **Actions** — User interactions (click, fill, type)
- **Assertions** — Validations and checks

Example:

```javascript
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/login.page');
const Auth0Page = require('../pages/auth0.page');
const HospitalsPage = require('../pages/hospitals.page');

test('hospital creation', async ({ page }) => {
  await page.goto('http://your-app/login');
  const login = new LoginPage(page);
  await login.clickLoginAsSuperAdmin();
  const auth = new Auth0Page(page);
  await auth.login('admin@example.com', 'password');
  const hospitals = new HospitalsPage(page);
  await hospitals.waitForList();
  await hospitals.clickAddHospital();
  // ... assertions
});
```

## Test Reports & GitHub Pages

### Local Reporting

After running tests, generate and view the Allure report locally:

```bash
npm run report          # Generate Allure report from test results
npm run serve:report   # Start HTTP server on localhost:8080
```

Then open **http://localhost:8080** in your browser to view:
- Test summary (passed, failed, skipped counts)
- Suite breakdown with status badges
- Performance metrics
- Environment configuration

### Live Reports on GitHub Pages

The report is automatically published to GitHub Pages on each test run:

1. **Enable GitHub Pages in your repo:**
   - Go to Settings → Pages
   - Select "Deploy from a branch"
   - Choose branch: `main` (or your default branch)
   - Folder: `/ (root)` or `/docs`
   - Click "Save"

2. **View live report:**
   - Reports are published at: `https://<username>.github.io/<repo-name>`
   - Example: `https://akshaymindbowser.github.io/MyCa_Automation`

3. **Automatic Updates:**
   - GitHub Actions workflow (`.github/workflows/deploy-report.yml`) runs on every push
   - Automatically runs tests, generates report, and deploys to GitHub Pages
   - No manual steps required after push!

### Report Structure

```
docs/
├── index.html              # Main dashboard (served locally and on GitHub Pages)
└── (additional report files)

test-results/
├── results.json            # Playwright JSON results (input to Allure generator)
├── junit.xml               # JUnit format for CI/CD integration
└── allure-results/         # Allure format results (generated by npm run report)
```

### Workflow

**Local Testing:**
```bash
npm test                   # Run all tests (generates test-results/results.json)
npm run report            # Convert results to Allure format & populate docs/
npm run serve:report      # View dashboard at http://localhost:8080
```

**GitHub Pages Deployment:**
```bash
git push origin main      # GitHub Actions automatically:
                          # → Runs tests
                          # → Generates report
                          # → Deploys to GitHub Pages
                          # → Report live at https://<username>.github.io/<repo>
```

### Environment Info in Reports

Reports display:
- **BASE_URL**: Target application URL (from .env)
- **BROWSER**: Browser type (chromium, firefox, webkit)
- **ENVIRONMENT**: Test environment (localhost, staging, etc.)

### GitHub Actions Workflow

The `.github/workflows/deploy-report.yml` workflow:
- ✓ Runs on push to main/master/develop branches
- ✓ Installs dependencies and Playwright browsers
- ✓ Runs all tests (continues on failure to generate reports)
- ✓ Generates Allure report
- ✓ Commits updated report to `/docs` folder
- ✓ Deploys to GitHub Pages automatically

To disable CI/CD reporting, delete `.github/workflows/deploy-report.yml`

## Notes

- All tests expect the app to be running at `BASE_URL`.
- Auth0 login flow requires "Login as Super Admin" button on login page.
- Adjust selectors in `pages/*.js` if your UI differs.
- Use `page.waitForSelector()` and `.catch()` for optional elements.
- Report server runs on **port 8080** — ensure it's not in use before starting.
- Don't commit `.env` file (already in .gitignore) — keep credentials local.

