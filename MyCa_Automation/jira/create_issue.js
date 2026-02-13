require('dotenv').config();

const https = require('https');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = raw[i + 1] && !raw[i + 1].startsWith('--') ? raw[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

function usage() {
  console.log('Usage: node jira/create_issue.js --type <Bug|Story> --summary "..." --description "..."');
  console.log('Environment variables (or .env): JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY');
}

async function createIssue({ type, summary, description, assignee }) {
  const base = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '').trim();
  const email = (process.env.JIRA_EMAIL || '').trim();
  const token = (process.env.JIRA_API_TOKEN || '').trim();
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!base || !email || !token || !projectKey) {
    console.error('Missing required environment variables. See .env.example');
    process.exit(2);
  }

  const payload = {
    fields: {
      project: { key: projectKey },
      summary: summary || 'No summary provided',
      description: description || '',
      issuetype: { name: type || 'Task' }
    }
  };

  if (assignee) payload.fields.assignee = { name: assignee };

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const body = JSON.stringify(payload);
  const url = new URL('/rest/api/3/issue', base);

  const options = {
    method: 'POST',
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ status: res.statusCode, body: json });
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

async function getCurrentUser() {
  const base = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '').trim();
  const email = (process.env.JIRA_EMAIL || '').trim();
  const token = (process.env.JIRA_API_TOKEN || '').trim();
  if (!base || !email || !token) return null;
  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const url = new URL('/rest/api/3/myself', base);
  const options = {
    method: 'GET',
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(json);
          return reject({ status: res.statusCode, body: json });
        } catch (e) { return reject(e); }
      });
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}

function promptForMissing(initial) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a)));

  return (async () => {
    const args = Object.assign({}, initial);
    if (!args.type) {
      const t = await ask('Issue type (Bug/Story/Task) [Task]: ');
      args.type = t.trim() || 'Task';
    }
    if (!args.summary) {
      const s = await ask('Summary: ');
      args.summary = s.trim();
    }
    if (!args.description) {
      const d = await ask('Description (optional): ');
      args.description = d.trim();
    }
    if (!args.assignee) {
      const a = await ask('Assignee (username, optional): ');
      if (a.trim()) args.assignee = a.trim();
    }
    rl.close();
    return args;
  })();
}

function loadTemplate(name) {
  try {
    if (!name) return null;
    const p = path.join(__dirname, 'templates', `${name}.json`);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function mergeTemplate(template, args) {
  if (!template) return args;
  const out = Object.assign({}, template);
  if (args.type) out.type = args.type;
  if (args.summary) out.summary = args.summary;
  if (args.description) out.description = args.description;
  if (args.assignee) out.assignee = args.assignee;
  return out;
}

(async () => {
  let args = parseArgs();
  // support a quick auth check: `--check-auth`
  if (args['check-auth'] || args.checkAuth) {
    try {
      const user = await getCurrentUser();
      console.log('Authenticated as:', user && user.emailAddress ? user.emailAddress : user.displayName || JSON.stringify(user));
      process.exit(0);
    } catch (e) {
      console.error('Auth check failed:', e);
      process.exit(4);
    }
  }
  // Apply template if provided
  if (args.template) {
    const tpl = loadTemplate(args.template);
    if (tpl) args = mergeTemplate(tpl, args);
    else console.warn(`Template not found: ${args.template}`);
  }

  if (!args.summary || !args.type) {
    console.log('Missing required arguments — entering interactive prompt.');
    args = await promptForMissing(args);
  }

  if (!args.summary || !args.type) {
    usage();
    process.exit(1);
  }

  try {
    const res = await createIssue({
      type: args.type,
      summary: args.summary,
      description: args.description || '',
      assignee: args.assignee
    });
    const key = res && res.key;
    console.log('Created issue:', key);
    if (key) console.log(`${process.env.JIRA_BASE_URL.replace(/\/$/, '')}/browse/${key}`);
  } catch (err) {
    console.error('Failed to create issue:', err);
    process.exit(3);
  }
})();
