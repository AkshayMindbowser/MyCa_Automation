const { execSync } = require('child_process');
const path = require('path');
const file = path.join(__dirname, '..', '..', '..', 'generated_tests', 'qase_case_530_verify_phone_number_field_leght_validation.js');
try { execSync(`node "${file}"`, { stdio: 'inherit' }); } catch (e) { process.exit(e.status || 1); }
