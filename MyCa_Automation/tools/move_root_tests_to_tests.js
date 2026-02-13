const fs = require('fs');
const path = require('path');

const root = process.cwd();
const destDir = path.join(root, 'tests');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const entries = fs.readdirSync(root, { withFileTypes: true });
const moved = [];
entries.forEach((e) => {
  if (!e.isFile()) return;
  const name = e.name;
  if (!name.endsWith('.js')) return;
  // skip known non-test files
  if (['playwright.config.js'].includes(name)) return;
  // match files that start with a digit (test scripts)
  if (!/^\d/.test(name)) return;

  const src = path.join(root, name);
  const dst = path.join(destDir, name);
  try {
    // if dest exists, append suffix
    let finalDst = dst;
    if (fs.existsSync(finalDst)) {
      const base = name.replace(/\.js$/, '');
      finalDst = path.join(destDir, base + '.moved.js');
    }
    fs.renameSync(src, finalDst);
    moved.push({ from: src, to: finalDst });
  } catch (err) {
    console.error('Failed to move', src, err.message);
  }
});

if (moved.length) {
  console.log('Moved files:');
  moved.forEach((m) => console.log(m.from, '->', m.to));
} else {
  console.log('No matching root test files found to move.');
}
