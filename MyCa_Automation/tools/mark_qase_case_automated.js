#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = val;
  });
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--case' || a === '-c') out.caseId = argv[++i];
    else if (a === '--project' || a === '-p') out.project = argv[++i];
    else if (a === '--token' || a === '-t') out.token = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function requestJson(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json });
        } catch (err) {
          reject(new Error('Invalid JSON response: ' + err.message + '\n' + data));
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  loadDotEnv();
  const args = parseArgs();
  if (args.help) {
    console.log('Usage: node tools/mark_qase_case_automated.js --case <CASE_ID> [--project <PROJECT_CODE>] [--token <QASE_API_TOKEN>]');
    process.exit(0);
  }

  const caseId = args.caseId;
  const project = args.project || process.env.QASE_PROJECT_CODE;
  const token = args.token || process.env.QASE_API_TOKEN;

  if (!caseId) { console.error('Error: --case is required'); process.exit(2); }
  if (!project) { console.error('Error: --project is required (--project or QASE_PROJECT_CODE env)'); process.exit(2); }
  if (!token) { console.error('Error: QASE_API_TOKEN required (--token or QASE_API_TOKEN env)'); process.exit(2); }

  const base = 'api.qase.io';
  const getPath = `/v1/case/${project}/${caseId}`;
  console.log('Fetching case', `${project}/${caseId}`);
  try {
    const getOpts = { hostname: base, path: getPath, method: 'GET', headers: { 'Content-Type': 'application/json', Token: token } };
    const getResp = await requestJson(getOpts);
    console.log('GET status:', getResp.status);
    console.log('GET response body:', JSON.stringify(getResp.body, null, 2));
    if (getResp.status !== 200) {
      console.error('Failed to fetch case:', JSON.stringify(getResp.body, null, 2));
      process.exit(3);
    }
    console.log('Current case data (trimmed):', { id: getResp.body && getResp.body.result && getResp.body.result.id, title: getResp.body && getResp.body.result && getResp.body.result.title });
  } catch (err) {
    console.error('Error fetching case:', err.message);
    process.exit(4);
  }

  // Try updating with commonly accepted automation flags. Qase accepts fields like `is_automated` or `automation`.
  const updatePath = `/v1/case/${project}/${caseId}`;
  const updateBody = { is_automated: true, automation: true };
  console.log('Marking case as automated...');
  try {
    const putOpts = { hostname: base, path: updatePath, method: 'PATCH', headers: { 'Content-Type': 'application/json', Token: token } };
    const putResp = await requestJson(putOpts, updateBody);
    console.log('PATCH status:', putResp.status);
    console.log('Response:', JSON.stringify(putResp.body, null, 2));
    if (putResp.status >= 200 && putResp.status < 300) {
      console.log('Case updated; verifying...');
      const verifyOpts = { hostname: base, path: getPath, method: 'GET', headers: { 'Content-Type': 'application/json', Token: token } };
      const verify = await requestJson(verifyOpts);
      console.log('Verify GET status:', verify.status);
      console.log('Verify result (trimmed):', { id: verify.body && verify.body.result && verify.body.result.id, title: verify.body && verify.body.result && verify.body.result.title, automated: verify.body && verify.body.result && (verify.body.result.is_automated || verify.body.result.automation || verify.body.result.automated) });
      process.exit(0);
    } else {
      console.error('Failed to update case. See response above.');
      process.exit(5);
    }
  } catch (err) {
    console.error('Error updating case:', err.message);
    process.exit(6);
  }
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(10); });
