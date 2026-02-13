const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  timeout: 60000,
  testDir: 'tests',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright']
  ],
  // Generate Allure report automatically after the test run via globalTeardown
  //globalTeardown: require.resolve('./tools/global-teardown-allure.js'),
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15000,
    navigationTimeout: 30000
  }
});
