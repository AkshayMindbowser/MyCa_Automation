const { test, expect } = require('@playwright/test');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Collect candidate scripts in the `tests/` directory that start with a number
const workspaceTestsDir = path.resolve(__dirname);
const allFiles = fs.readdirSync(workspaceTestsDir);
const scriptFiles = allFiles.filter(f => /^\d+.*\.js$/.test(f));

if (scriptFiles.length === 0) {
  test('no scripts found', async () => {
    test.info().attach('note', { body: 'No numbered scripts found in workspace root.', contentType: 'text/plain' });
  });
}

for (const file of scriptFiles) {
  const filePath = path.join(workspaceRoot, file);
  test(file, async ({}, testInfo) => {
    testInfo.setTimeout(120000);
    await new Promise((resolve) => {
      const p = exec(`node "${filePath}"`, { cwd: workspaceTestsDir, windowsHide: false }, (err, stdout, stderr) => {
        // Sanitize attachments: ensure we attach strings only and limit length
        const safeString = (v) => {
          try {
            if (v === undefined || v === null) return '';
            if (typeof v === 'string') return v.length > 20000 ? v.slice(0, 20000) + '\n...[truncated]' : v;
            // convert Buffers or objects to string safely
            if (Buffer.isBuffer(v)) return v.toString('utf8').slice(0, 20000);
            return JSON.stringify(v).slice(0, 20000);
          } catch (e) { return String(v); }
        };

        try {
          const out = safeString(stdout);
          const errOut = safeString(stderr);
          if (out) testInfo.attach('stdout', { body: out, contentType: 'text/plain' });
          if (errOut) testInfo.attach('stderr', { body: errOut, contentType: 'text/plain' });
        } catch (attachErr) {
          // fallback: attach minimal info
          try { testInfo.attach('stdout', { body: 'Could not attach output', contentType: 'text/plain' }); } catch(e){}
        }

        if (err) {
          // attach error message safely
          try { testInfo.attach('error', { body: safeString(err.message || err), contentType: 'text/plain' }); } catch(e){}
          resolve({ passed: false });
        } else {
          resolve({ passed: true });
        }
      });

      // forward live output to process stdout
      p.stdout && p.stdout.pipe(process.stdout);
      p.stderr && p.stderr.pipe(process.stderr);
    }).then((res) => {
      if (!res.passed) {
        throw new Error(`${file} failed`);
      }
    });
  });
}
