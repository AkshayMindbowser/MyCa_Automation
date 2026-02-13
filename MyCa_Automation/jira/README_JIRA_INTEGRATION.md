Jira Integration for creating issues from the repo

Overview
- Small Node CLI to create Jira issues using your Jira Cloud API token.

Setup
1. Create an API token in Jira (https://id.atlassian.com/manage-profile/security/api-tokens).
2. Copy `jira/.env.example` to `jira/.env` and fill values: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`.
3. Install dependencies if needed (project already has `dotenv`):

```bash
npm install
```

Usage
- Run via npm script:

```bash
npm run create-jira-issue -- --type Bug --summary "My bug summary" --description "Steps to reproduce"
```

- Or directly:

```bash
node jira/create_issue.js --type Story --summary "New story" --description "Acceptance criteria"
```

Notes
- The script reads credentials from environment or `jira/.env` (via `dotenv`).
- Keep API tokens secret — do not commit `.env` to source control.
- If you want VS Code integration, I can add a task or snippet to run this from the command palette.

Templates
- Place JSON templates in `jira/templates`. Examples provided: `bug.json` and `story.json`.
- Use `--template <name>` to pre-fill fields from a template. CLI merges any provided flags with template values (flags override template).

VS Code snippets
- Workspace snippets are available at `.vscode/jira-snippets.code-snippets`. Use prefixes `jira-bug` and `jira-story` to insert commands.
