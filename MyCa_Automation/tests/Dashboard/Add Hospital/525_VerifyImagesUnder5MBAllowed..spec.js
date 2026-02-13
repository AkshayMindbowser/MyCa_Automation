const { execSync } = require('child_process');
const path = require('path');
const file = path.join(__dirname, '..', '..', '..', 'generated_tests', 'qase_case_525_verify_whether_images_with_less_than_5_mb_size_are_allowed.js');
try { execSync(`node "${file}"`, { stdio: 'inherit' }); } catch (e) { process.exit(e.status || 1); }
