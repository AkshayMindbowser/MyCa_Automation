const { execSync } = require('child_process');
const path = require('path');
const file = path.join(__dirname, '..', '..', 'generated_tests', 'qase_case_527_verify_whether_hospital_is_being_created_sucessully_using_va.js');
try { execSync(`node "${file}"`, { stdio: 'inherit' }); } catch (e) { process.exit(e.status || 1); }
