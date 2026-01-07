const { execSync } = require('child_process');
const path = require('path');
const file = path.join(__dirname, 'generated_tests', 'qase_case_528_verify_whether_error_message_is_shown_when_incorrect_email_i.js');
try { execSync(`node "${file}"`, { stdio: 'inherit' }); } catch (e) { process.exit(e.status || 1); }
