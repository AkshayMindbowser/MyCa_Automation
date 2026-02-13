const { execSync } = require('child_process');
const path = require('path');
const file = path.join(__dirname, '..', '..', 'generated_tests', 'qase_case_541_validate_copy_functionality.js');
try { execSync(`node "${file}"`, { stdio: 'inherit' }); } catch (e) { process.exit(e.status || 1); }
