#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('crypto').randomUUID || (() => Math.random().toString(36).substr(2, 9))();

function generateUUID() {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadSummary() {
  const summaryPath = path.join(process.cwd(), 'tools', 'last_run_summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error('Error: last_run_summary.json not found');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
}

function generateAllureResult(test, index) {
  const uuid = generateUUID();
  const testName = path.basename(test.file);
  const suiteName = path.dirname(test.file).split(path.sep).pop() || 'tests';
  
  const result = {
    uuid,
    historyId: testName,
    fullName: `${suiteName} > ${testName}`,
    labels: [
      { name: 'suite', value: suiteName },
      { name: 'host', value: 'localhost' },
      { name: 'thread', value: String(process.pid) },
      { name: 'framework', value: 'playwright' },
      { name: 'language', value: 'javascript' }
    ],
    links: [],
    name: testName,
    status: test.passed ? 'passed' : 'failed',
    stage: 'finished',
    start: Date.now() - (54 - index) * 5000,
    stop: Date.now() - (53 - index) * 5000,
    duration: 5000,
    description: `Test: ${testName}`,
    descriptionHtml: `<p>Test file: ${test.file}</p><p>Exit code: ${test.exitCode}</p>`,
    steps: [
      {
        name: 'Execute test',
        status: test.passed ? 'passed' : 'failed',
        stage: 'finished',
        start: Date.now() - (54 - index) * 5000,
        stop: Date.now() - (53 - index) * 5000,
        steps: []
      }
    ],
    attachments: [],
    parameters: []
  };

  if (!test.passed) {
    result.statusDetails = {
      message: `Test failed with exit code: ${test.exitCode}`,
      trace: `Test execution failed during test run.`,
      known: true,
      muted: false,
      flaky: false
    };
  }

  return result;
}

function main() {
  const summary = loadSummary();
  const resultsDir = path.join(process.cwd(), 'allure-results');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Generate result JSON files
  summary.forEach((test, index) => {
    const result = generateAllureResult(test, index);
    const filename = `${result.uuid}-result.json`;
    const filepath = path.join(resultsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`Generated: ${filename}`);
  });

  // Generate categories.json for Allure
  const categoriesPath = path.join(resultsDir, 'categories.json');
  const categories = [
    {
      name: 'Test Failures',
      matchedStatuses: ['failed']
    }
  ];
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
  console.log(`Generated: categories.json`);

  console.log(`\nGenerated Allure results for ${summary.length} tests`);
  const passed = summary.filter(t => t.passed).length;
  const failed = summary.length - passed;
  console.log(`Passed: ${passed}, Failed: ${failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
