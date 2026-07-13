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

## Run it always-on (recommended)

For daily use, run it as a background service that starts on login and restarts
if it ever dies. The backend serves the built UI + API as a **single process on
one port** (`http://localhost:3000`).

```bash
./deploy/install.sh
```

This builds the frontend, installs a launchd agent (`com.joelabeyta.symbiotes`),
and starts it. Then just bookmark **http://localhost:3000**.

- **After changing code / pulling updates:** `./deploy/update.sh` (rebuilds + restarts).
- **Logs:** `~/Library/Logs/symbiotes.log` (includes the to-do activity log).
- **Remove it:** `./deploy/uninstall.sh`.
- If you upgrade Node via nvm, re-run `./deploy/install.sh` (it re-detects the node path).

## Run for development

```bash
npm run dev
```

Two processes with live-reload: API on `http://localhost:<PORT>` (default 3000),
Vite dev server on `http://localhost:<FRONTEND_PORT>` (default 5180; Vite bumps
to the next free port and prints the URL). Use this while editing code.

You can also run the single-process build ad-hoc without the service:
`npm run serve` (build + start), then open `http://localhost:3000`.

## Test

```bash
npm test
```
