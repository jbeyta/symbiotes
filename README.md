# Symbiotes

A local dark-mode dashboard: my Jira tickets, my open GitHub PRs (cross-linked
by ticket key), manually-tracked untracked tasks, and quick notes.

## Setup

```bash
npm run install:all
cp .env.example .env   # fill in Jira + GitHub credentials
```

`.env` lives at the repo root and holds:
- `JIRA_BASE_URL` — e.g. `https://your-domain.atlassian.net`
- `JIRA_EMAIL` / `JIRA_API_TOKEN` — Atlassian account email + API token
- `GITHUB_TOKEN` — personal access token with `repo` read scope
- `PORT` — backend port (default `3000`); the frontend proxy follows it automatically
- `FRONTEND_PORT` — dev-server port (default `5180`); change it if it collides with another app

## Run

```bash
npm run dev
```

Backend on `http://localhost:<PORT>` (default 3000), dashboard on
`http://localhost:<FRONTEND_PORT>` (default 5180). If that port is taken, Vite
automatically picks the next free one and prints the actual URL — open the URL
it logs.

## Test

```bash
npm test
```
