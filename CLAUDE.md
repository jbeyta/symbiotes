# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Symbiotes is a personal, local-only dark-mode dashboard: the user's Jira tickets,
their open GitHub PRs (cross-linked to tickets by issue key), manually-tracked
to-dos, and a "done" activity log. It runs on `localhost` only — bound to
`127.0.0.1`, single-user, no auth.

## Commands

```bash
npm run install:all       # install root + backend + frontend deps
npm run dev               # dev: backend (tsx watch, :3000) + Vite (:5180) concurrently
npm run serve             # prod-style: build frontend, then serve everything from backend on :3000
npm test                  # backend tests then frontend tests

# single-package / single-test (vitest)
npm --prefix backend test              # backend only
npm --prefix frontend test             # frontend only
npm --prefix backend test -- todos     # only files matching "todos"
npm --prefix backend exec vitest       # watch mode
```

Deployment as an always-on launchd agent lives in `deploy/`: `./deploy/install.sh`
(build + install + start), `./deploy/update.sh` (rebuild + restart after code
changes), `./deploy/uninstall.sh`. Logs go to `~/Library/Logs/symbiotes.log`.

## Configuration

`.env` at the repo root (not per-package) holds `JIRA_BASE_URL`, `JIRA_EMAIL`,
`JIRA_API_TOKEN`, `GITHUB_TOKEN`, and optional `PORT` (default 3000) /
`FRONTEND_PORT` (default 5180). Both `backend/src/server.ts` and
`frontend/vite.config.ts` deliberately read this single root `.env` regardless of
cwd; the Vite dev proxy follows `PORT` so `/api` reaches the backend.

## Architecture

Two-package layout (`backend/`, `frontend/`), both ESM TypeScript.

**Backend is not compiled to run** — `tsx` executes `.ts` directly (`start`/`dev`).
`tsc` is only used by the frontend build. Because of this, backend source uses
**`.js` import specifiers on `.ts` files** (e.g. `import { createApp } from "./app.js"`)
— this is required, not a mistake; keep the `.js` extension on relative imports.

**Dependency-injection seam.** `createApp({ store, getTickets, getPrs })` in
`backend/src/app.ts` is the composition root. `server.ts` wires in the real
`SqliteStore` and live Jira/GitHub fetchers; tests pass fakes. Never reach for
globals inside routes — take dependencies through this seam so they stay testable.

**Single-process production serving.** `server.ts` mounts API routes first, then
serves `frontend/dist` as static files with an SPA fallback to `index.html` for
any non-`/api/` path. So prod is one Express process on one port; dev is two
processes with the Vite proxy bridging them.

**Jira ↔ PR cross-linking** (`backend/src/routes/dashboard.ts` + `links.ts`).
The dashboard endpoint fetches tickets and PRs independently (each failure is
captured into `errors.jira` / `errors.github` rather than failing the whole
response), then links them: `extractJiraKey` runs a regex over each PR's branch
and title to find an issue key, and each ticket collects the numbers of PRs whose
key matches. `links.ts` exports a shared regex with a `g` flag — use it only via
`String.prototype.match` (which resets `lastIndex`), never `.exec`/`.matchAll`.

**Persistence** (`backend/src/store.ts` interface + `sqlite-store.ts`). SQLite via
`better-sqlite3` (WAL mode), file `backend/symbiotes.db` (gitignored). Notes and
to-dos only. Schema is created idempotently and `migrate()` does lightweight
in-code column-adds for older DBs — when adding a column, add it to both `SCHEMA`
and a guarded `ALTER TABLE` in `migrate()`. To-do specifics: `position` drives
ordering (reorder rewrites positions in a transaction); `completed_at` is stamped
when an item is newly checked and cleared when unchecked, but an explicit
`completed_at` in the patch wins (used to move a done item to another day).
To-do mutations also emit a `[todo] …` activity line to the server console/log.

**Frontend** (`frontend/src/`). React 18 + Vite, no router. `App.tsx` is the
single page: a grid of `JiraBox`, `PrBox`, `TodosBox`, `DoneLogBox` (`NotesBox`
exists but is currently swapped out of the grid). `api.ts` is a thin typed
`fetch` wrapper over the `/api` endpoints — all server calls go through it.
Open (not-done) vs. done to-dos are split in `App.tsx`: only open to-dos feed
`TodosBox` and disable the per-item "Create To-Do" button, keyed on the item's
stable `url`, so a re-opened need on the same PR/ticket re-enables it.

## Testing conventions

Backend uses `vitest` + `supertest` against `createApp` with in-memory fakes for
the store and Jira/GitHub fetchers (see `backend/test/`). Frontend uses `vitest` +
Testing Library in jsdom (`frontend/src/**/__tests__/`). Prefer exercising through
these seams over mocking modules.
