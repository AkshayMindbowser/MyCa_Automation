const { execSync } = require('child_process');
const path = require('path');
const file = path.join(__dirname, '..', '..', 'generated_tests', 'qase_case_522_verify_whether_user_is_restricted_from_creating_duplicate_ho.js');
try { execSync(`node "${file}"`, { stdio: 'inherit' }); } catch (e) { process.exit(e.status || 1); }
