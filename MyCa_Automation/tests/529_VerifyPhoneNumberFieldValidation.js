const { execSync } = require('child_process');
const path = require('path');
const file = path.join(__dirname, 'generated_tests', 'qase_case_529_verify_the_phone_number_field_validation.js');
try { execSync(`node "${file}"`, { stdio: 'inherit' }); } catch (e) { process.exit(e.status || 1); }
