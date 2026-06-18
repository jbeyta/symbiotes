# Symbiotes — Design

**Date:** 2026-06-18
**Status:** Approved design, pre-implementation

## Problem

Work arrives through three channels that don't share a single view:

1. **Jira tickets** assigned to me — tracked well in Jira's own UI.
2. **GitHub PRs** I've opened — these get *lost*. When a ticket needs multiple teams, I do my part and the ticket moves to another team's board. My PR then sits forgotten because the ticket is no longer on my board.
3. **Untracked requests** — emails / Slack messages I'm responsible for that may never become a Jira ticket or a PR (research, follow-ups, chasing a third-party support team).

Symbiotes is a single dashboard that surfaces all of it in one place, so nothing falls through the cracks — especially open PRs whose tickets have drifted away.

## Goals

- One screen showing: my Jira tickets, my open PRs, untracked tasks, quick notes.
- Surface open PRs **independent of where the Jira ticket currently lives**.
- Clean, dark-mode, responsive UI.
- Manual CRUD for the two locally-owned boxes (tasks, notes).
- Refresh on page load + a manual "Refresh" button. No real-time, no polling cadence.

## Non-Goals (YAGNI)

- No multi-user support, accounts, or auth beyond the API tokens.
- No cloud hosting, no domain, no HTTPS — runs at `localhost`.
- No real-time updates or background sync.
- No AWS / DynamoDB. (Data layer is kept swappable so this *can* change later, but it is out of scope now.)
- No mobile/remote access in v1.

## Architecture

Local two-part app, started with a single command. No cloud.

```
┌─────────────────────────────────────────┐
│  Browser (localhost:5173)                │
│  React + Vite + TypeScript, dark theme   │
│  4-box dashboard, "Refresh" button       │
└───────────────┬─────────────────────────┘
                │ HTTP (localhost only)
┌───────────────▼─────────────────────────┐
│  Local Node backend (localhost:3000)     │
│  Express + TypeScript                    │
│  - Holds Jira + GitHub creds (.env)      │
│  - Proxies API calls (fixes CORS + keeps │
│    tokens off the browser)               │
│  - Owns the SQLite file                  │
│  - Data access behind a Store interface  │
└───────────────┬─────────────────────────┘
                │
        ┌───────▼────────┐   ┌──────────────┐
        │ symbiotes.db   │   │ Jira Cloud + │
        │ (SQLite,       │   │ GitHub REST  │
        │  better-sqlite3)│  │ APIs         │
        └────────────────┘   └──────────────┘
```

**Why a backend at all (not browser-only):** Jira Cloud and GitHub block direct browser calls (CORS), and putting API tokens in browser JS would expose them. A thin local proxy solves both. It's still fully local — one `npm run`, creds never leave the machine.

**Repo layout:** one repository, two packages.

```
symbiotes/
  backend/      Express + TS, SQLite, API proxy
  frontend/     React + Vite + TS dashboard
  package.json  root: one command starts both
  .env          Jira + GitHub creds (gitignored)
  .env.example  documented template
```

### Stack

- **Frontend:** React + Vite + TypeScript.
- **Backend:** Node + Express + TypeScript, `better-sqlite3`.
- **Storage:** single local SQLite file (`symbiotes.db`).
- Deliberately plain and boring.

## Components

### Backend

**Config / secrets.** Reads `.env`: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `GITHUB_TOKEN`, optional `PORT`. `.env` is gitignored; `.env.example` documents the shape.

**Jira client.** Calls Jira Cloud REST API (`*.atlassian.net`), auth via email + API token (Basic auth). Fetches issues assigned to the current user that are not Done/Closed. Returns `{ key, title, status }` per ticket, for any project (RW, FRONT, AI, …).

**GitHub client.** Calls GitHub REST API with a personal token. Fetches open PRs authored by the current user across all repos (via the search API: `is:pr is:open author:@me`). Returns `{ number, title, repo, url, branch }` per PR.

**Link resolver.** Pure function. Extracts a Jira key from a PR's branch name and title using regex `\b[A-Z][A-Z0-9]+-\d+\b`. Used to populate "linked PR" on tickets and "linked Jira" on PRs by matching keys both directions. No external integration required.

**Store (data layer).** Interface `Store` with methods for tasks and notes CRUD. Concrete impl `SqliteStore` backed by `better-sqlite3`. Keeping consumers behind the interface is what makes a future cloud swap a contained change.

**HTTP API.** Express routes:
- `GET /api/jira` → live tickets
- `GET /api/github` → live PRs
- `GET /api/dashboard` → combined tickets + PRs with links resolved (one call for page load / refresh)
- `GET/POST/PUT/DELETE /api/tasks` → untracked tasks CRUD
- `GET/POST/PUT/DELETE /api/notes` → quick notes CRUD

### Frontend

Single-page dashboard, four boxes in a responsive grid (stacks on narrow widths). Dark theme. A top-bar **Refresh** button re-fetches `/api/dashboard`; the page also fetches on load.

- **Box 1 — My Jira tickets** (read-only, live): rows `KEY · title · status · linked PR (if any)`. Every assigned, not-done ticket.
- **Box 2 — My open PRs** (read-only, live): rows `#num · title · linked Jira (if any)`. The box that solves the core problem.
- **Box 3 — Untracked tasks** (local CRUD): title, description, status dropdown. Statuses: **In Progress / Responded / Waiting on third party / Resolved**. Add / edit / delete inline.
- **Box 4 — Quick notes** (local CRUD): list by title, click to expand description. Add / edit / delete.

## Data Model (SQLite)

```sql
CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'In Progress',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
```

Jira tickets and PRs are **not** stored — always fetched live.

## Data Flow

**Page load / Refresh:** frontend calls `GET /api/dashboard` → backend calls Jira + GitHub in parallel → link resolver matches keys → combined payload returned → boxes 1 & 2 render. Boxes 3 & 4 load from their own CRUD endpoints.

**Manual edits:** task/note create/edit/delete → CRUD endpoint → `SqliteStore` writes `symbiotes.db` → UI updates.

## Error Handling

- **Jira or GitHub call fails** (bad token, network, rate limit): that box shows an inline error state with a retry affordance; the other boxes still render. One dead integration never blanks the whole dashboard.
- **Missing/invalid creds at startup:** backend logs a clear message naming the missing `.env` var; affected box shows "not configured."
- **SQLite write failure:** surfaced to the UI as a failed-save message; the local data is never silently dropped.
- **Link resolver:** no match simply yields no link — never an error.

## Testing

- **Link resolver:** unit tests — keys in branch vs title, multiple projects (RW/FRONT/AI), no-match, malformed.
- **Store:** unit tests against an in-memory SQLite DB — CRUD round-trips for tasks and notes.
- **API routes:** integration tests with mocked Jira/GitHub clients — success and failure paths (including one integration down).
- **Frontend:** light component tests for the boxes (loading, error, empty, populated states). Not over-tested — it's a personal dashboard.

## Future (explicitly deferred)

- Swap `SqliteStore` for a cloud store (e.g. DynamoDB) behind the same `Store` interface.
- Remote/mobile access (would need hosting + auth).
- Richer PR↔Jira linking via Jira's dev-panel integration if regex parsing proves insufficient.
