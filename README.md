# Symbiotes

A local dark-mode dashboard: my Jira tickets, my open GitHub PRs (cross-linked
by ticket key), manually-tracked untracked tasks, and quick notes.

## Setup

```bash
npm run install:all
cp .env.example .env   # fill in Jira + GitHub credentials
```

`.env` values:
- `JIRA_BASE_URL` — e.g. `https://your-domain.atlassian.net`
- `JIRA_EMAIL` / `JIRA_API_TOKEN` — Atlassian account email + API token
- `GITHUB_TOKEN` — personal access token with `repo` read scope

## Run

```bash
npm run dev
```

Backend on `http://localhost:3000`, dashboard on `http://localhost:5173`.

## Test

```bash
npm test
```
