const { execSync } = require('child_process');
const path = require('path');
const file = path.join(__dirname, '..', '..', '..', 'generated_tests', 'qase_case_538_verify_client_id_read_only.js');
try { execSync(`node "${file}"`, { stdio: 'inherit' }); } catch (e) { process.exit(e.status || 1); }
