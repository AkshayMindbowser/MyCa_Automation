#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = val;
  });
}

function usage() {
  console.log('Usage: node tools/generate_test_from_qase.js --case <CASE_ID> [--project <PROJECT_CODE>] [--token <QASE_API_TOKEN>] [--out <output_path>]');
  console.log('You can set environment variables QASE_API_TOKEN and QASE_PROJECT_CODE instead of using flags.');
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--case' || a === '-c') out.caseId = argv[++i];
    else if (a === '--project' || a === '-p') out.project = argv[++i];
    else if (a === '--token' || a === '-t') out.token = argv[++i];
    else if (a === '--out' || a === '-o') out.out = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    opts.headers = headers || {};
    https
      .get(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, body: json });
          } catch (err) {
            reject(new Error('Invalid JSON response: ' + err.message + '\n' + data));
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

function slugify(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

async function main() {
  loadDotEnv();
  const args = parseArgs();
  if (args.help) return usage();

  let caseId = args.caseId;
  const project = args.project || process.env.QASE_PROJECT_CODE;
  const token = args.token || process.env.QASE_API_TOKEN;

  if (!caseId) {
    caseId = (await ask('Enter Qase case id: ')).trim();
  }

  if (!caseId) {
    console.error('Error: --case is required');
    usage();
    process.exit(2);
  }
  if (!project) {
    console.error('Error: Qase project code is required (--project or QASE_PROJECT_CODE env)');
    process.exit(2);
  }
  if (!token) {
    console.error('Error: Qase API token is required (--token or QASE_API_TOKEN env)');
    process.exit(2);
  }

  const url = `https://api.qase.io/v1/case/${project}/${caseId}`;
  console.log('Fetching Qase case from', url);
  let resp;
  try {
    resp = await fetchJson(url, { 'Content-Type': 'application/json', Token: token });
  } catch (err) {
    console.error('Request failed:', err.message);
    process.exit(3);
  }

  if (resp.status !== 200) {
    console.error('Qase returned status', resp.status);
    console.error(JSON.stringify(resp.body, null, 2));
    process.exit(4);
  }

  const data = resp.body && resp.body.result ? resp.body.result : resp.body;
  const title = data.title || `case_${caseId}`;
  const preconditions = data.preconditions || '';
  const postconditions = data.postconditions || '';
  const steps = Array.isArray(data.steps) ? data.steps : (data.steps && data.steps.items) || [];

  const slug = slugify(title || `case_${caseId}`);
  const outDir = args.out ? args.out : path.join(process.cwd(), 'generated_tests');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filename = path.join(outDir, `qase_case_${caseId}_${slug}.js`);

  const lines = [];
  lines.push("/**");
  lines.push(` * Generated from Qase case ${caseId} (${project})`);
  lines.push(` * Title: ${title}`);
  if (preconditions) lines.push(` * Preconditions: ${preconditions}`);
  if (postconditions) lines.push(` * Postconditions: ${postconditions}`);
  lines.push(' *');
  lines.push(' * Steps (from Qase):');
  if (steps && steps.length) {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const action = s.action || s.description || s.step || '';
      const expected = s.expected || '';
      lines.push(` * ${i + 1}. ACTION: ${action}`);
      if (expected) lines.push(` *    EXPECTED: ${expected}`);
    }
  } else {
    lines.push(' *   (no step data returned from Qase)');
  }
  lines.push(' */');
  lines.push('');
  lines.push("const { chromium } = require('playwright');");
  lines.push('');
  lines.push('(async function main(){');
  lines.push("  const browser = await chromium.launch({ headless: false });");
  lines.push('  const page = await browser.newPage();');
  lines.push('');
  lines.push('  try {');
  lines.push("    // TODO: translate the Qase steps into Playwright actions below.");
  if (steps && steps.length) {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const action = (s.action || s.description || s.step || '').replace(/\r?\n/g, ' ');
      lines.push(`    // Step ${i + 1}: ${action}`);
      lines.push("    // await page.click('...'); // replace with real selector");
      lines.push("    // await page.fill('...','...');");
      lines.push('');
    }
  } else {
    lines.push("    // Example: open the app login page and assert visible elements");
    lines.push("    // await page.goto('http://your-app/login');");
    lines.push("    // await page.waitForSelector('text=Login as Super Admin');");
  }
  lines.push('');
  lines.push("    // Assertions: replace with actual expectations from the case");
  lines.push("    // e.g. await page.waitForSelector('text=Dashboard');");
  lines.push('');
  lines.push('    console.log("Test skeleton created from Qase case. Update the script and run it with node.");');
  lines.push('  } catch (err) {');
  lines.push('    console.error("Error during generated test run:", err);');
  lines.push('    process.exitCode = 2;');
  lines.push('  } finally {');
  lines.push("    // Keep browser open on failure for inspection if desired");
  lines.push("    await browser.close();");
  lines.push('  }');
  lines.push('})();');

  fs.writeFileSync(filename, lines.join('\n'));
  console.log('Wrote', filename);
  console.log('Open the file and replace the TODO comments with concrete Playwright steps.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(10);
});
