const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function findTestFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...findTestFiles(full));
    } else if (/\.(spec|test)\.js$/.test(e.name)) {
      results.push(full);
    }
  }
  return results;
}

function run() {
  const testsDir = path.join(process.cwd(), 'tests');
  if (!fs.existsSync(testsDir)) {
    console.error('tests directory not found:', testsDir);
    process.exit(1);
  }

  const files = findTestFiles(testsDir).sort();
  console.log(`Found ${files.length} test files. Running sequentially...`);

  const summary = [];

  for (const file of files) {
    const relPath = path.relative(process.cwd(), file).split(path.sep).join('/');
    console.log('\n=== Running:', relPath, '===');

    // Heuristic: if the file doesn't contain Playwright test harness calls, run it with node.
    let content = '';
    try { content = fs.readFileSync(file, 'utf8'); } catch (e) { /* ignore */ }
    const looksLikePlaywrightTest = /(^|\W)(test|describe)\s*\(|require\(['\"]@playwright\/test['\"]\)|const\s+\{\s*test\s*\}/.test(content);

    let result;
    if (looksLikePlaywrightTest) {
      result = spawnSync('npx', ['playwright', 'test', relPath], { stdio: 'inherit', shell: true });
    } else {
      // Run as a standalone Node script (covers generated tests and exec wrappers)
      // Use shell:false to avoid Windows path quoting issues for the node executable
      result = spawnSync(process.execPath, [relPath], { stdio: 'inherit', shell: false });
    }
    const passed = result.status === 0;
    summary.push({ file: path.relative(process.cwd(), file), exitCode: result.status, passed });
    console.log(`Result: ${passed ? 'PASS' : 'FAIL'} (exit ${result.status})`);
  }

  console.log('\n=== Test run summary ===');
  let passedCount = 0;
  for (const s of summary) {
    console.log(`${s.passed ? 'PASS' : 'FAIL'} - ${s.file}`);
    if (s.passed) passedCount++;
  }
  console.log(`\nPassed ${passedCount} / ${summary.length}`);

  // Save summary file
  try {
    fs.writeFileSync(path.join(process.cwd(), 'tools', 'last_run_summary.json'), JSON.stringify(summary, null, 2));
    console.log('Saved summary to tools/last_run_summary.json');
  } catch (e) {
    console.warn('Failed to write summary file:', e.message);
  }

  // Exit 0 so the overall orchestration continues even if tests failed.
  process.exit(0);
}

run();
