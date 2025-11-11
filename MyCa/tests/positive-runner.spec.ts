import { test } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// This wrapper runs each standalone script in Positive-testcases as a separate Playwright test.
// It executes them with `node` and captures stdout/stderr into files for debugging.
const TEST_DIR = path.resolve(__dirname, '..', 'Positive-testcases');

function listScripts() {
  return fs.readdirSync(TEST_DIR)
    .filter(f => f.endsWith('.js') && f !== 'test-close-function.js' && f !== 'login.spec.js')
    .sort();
}

for (const script of listScripts()) {
  const testName = script.replace('.js', '').replace(/_/g, ' ');
  test(testName, async () => {
    test.setTimeout(180000); // 3 minutes
    
    const scriptPath = path.join(TEST_DIR, script);
    const outFile = path.join(process.cwd(), 'test-outputs', `${script}.out.log`);
    const errFile = path.join(process.cwd(), 'test-outputs', `${script}.err.log`);
    try {
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
    } catch (e) {}

    try {
      // run with a timeout to avoid long-hangs
      const cmd = `node "${scriptPath}"`;
      console.log('Running', cmd);
      const opts = { encoding: 'utf8' as const, timeout: 180000 };
      const stdout = execSync(cmd, opts);
      fs.writeFileSync(outFile, stdout, 'utf8');
      // if script returns normally, consider it success
    } catch (error: unknown) {
      // capture error output
      const e = error as any;
      const output = e.stdout ? String(e.stdout) : (e.message || '');
      const err = e.stderr ? String(e.stderr) : '';
      try { fs.writeFileSync(outFile, output, 'utf8'); } catch (ee) {}
      try { fs.writeFileSync(errFile, err || output, 'utf8'); } catch (ee) {}
      throw new Error(`Script ${script} failed. See logs: ${outFile} ${errFile}. (${e.message})`);
    }
  });
}
