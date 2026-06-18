# Symbiotes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local dark-mode dashboard with four boxes — my Jira tickets, my open GitHub PRs (with their Jira keys cross-linked), manually-tracked untracked tasks, and quick notes — built as a TS frontend plus a thin local Node backend over SQLite.

**Architecture:** One repo, two packages. `backend/` (Express + TypeScript) holds the Jira/GitHub credentials, proxies those APIs (fixing CORS and keeping tokens off the browser), resolves PR↔Jira links by regex, and owns a local SQLite file behind a `Store` interface. `frontend/` (React + Vite + TypeScript) renders the four-box dashboard and talks only to `localhost`. A root script starts both with one command.

**Tech Stack:** Node 20+ (built-in `fetch`), TypeScript, Express, better-sqlite3, Vitest + Supertest (backend tests), React + Vite, Vitest + @testing-library/react (frontend tests), `concurrently` (root runner), `tsx` (dev runner).

## Global Constraints

- **Local only.** Backend binds `127.0.0.1`. No cloud, no domain, no auth beyond the API tokens. Frontend at `localhost:5173`, backend at `localhost:3000` (override via `PORT`).
- **Secrets** come only from `.env` (gitignored): `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `GITHUB_TOKEN`, optional `PORT`. Never commit real values; `.env.example` documents the shape.
- **Jira key regex** is exactly `\b[A-Z][A-Z0-9]+-\d+\b` — used everywhere a key is parsed.
- **Persistence** is limited to `tasks` and `notes`. Jira tickets and PRs are always fetched live, never stored.
- **Task statuses** (untracked tasks): `In Progress`, `Responded`, `Waiting on third party`, `Resolved`. Default `In Progress`.
- **Row spacing:** within every box, each row has `1rem` margin below it except the last row (no bottom margin).
- **Resilience:** one failing integration (Jira or GitHub) must never blank the other boxes.
- **Language:** TypeScript strict mode on in both packages. TDD throughout, commit per task.

---

## File Structure

```
symbiotes/
  package.json                      root: scripts to run both packages
  .gitignore
  .env.example
  backend/
    package.json
    tsconfig.json
    vitest.config.ts
    src/
      config.ts                     loads + validates .env
      links.ts                      pure Jira-key parsing / resolution
      store.ts                      Store interface + types
      sqlite-store.ts               SqliteStore impl
      jira.ts                       Jira Cloud client
      github.ts                     GitHub client
      routes/
        dashboard.ts                GET /api/dashboard
        tasks.ts                    tasks CRUD router
        notes.ts                    notes CRUD router
      app.ts                        builds the Express app (testable)
      server.ts                     binds the port (entrypoint)
    test/
      links.test.ts
      sqlite-store.test.ts
      dashboard.test.ts
      tasks.test.ts
      notes.test.ts
  frontend/
    package.json
    tsconfig.json
    vite.config.ts
    index.html
    src/
      main.tsx
      App.tsx
      api.ts                        typed fetch client + shared types
      theme.css                     dark theme + .row spacing
      components/
        Box.tsx                     shared box shell
        JiraBox.tsx
        PrBox.tsx
        TasksBox.tsx
        NotesBox.tsx
      components/__tests__/
        TasksBox.test.tsx
        NotesBox.test.tsx
```

---

### Task 1: Repo scaffolding + backend config

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`
- Create: `backend/src/config.ts`
- Test: `backend/test/config.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `loadConfig(env: NodeJS.ProcessEnv): Config` where
  `Config = { jiraBaseUrl: string; jiraEmail: string; jiraApiToken: string; githubToken: string; port: number }`.
  Throws `Error` listing every missing required var. `port` defaults to `3000`.

- [ ] **Step 1: Create root `.gitignore`**

```
node_modules/
.env
*.db
dist/
```

- [ ] **Step 2: Create `.env.example`**

```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-jira-api-token
GITHUB_TOKEN=your-github-personal-access-token
PORT=3000
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "symbiotes",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "concurrently -n backend,frontend -c blue,green \"npm:dev:backend\" \"npm:dev:frontend\"",
    "dev:backend": "npm --prefix backend run dev",
    "dev:frontend": "npm --prefix frontend run dev",
    "test": "npm --prefix backend test && npm --prefix frontend test",
    "install:all": "npm install && npm --prefix backend install && npm --prefix frontend install"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 4: Create `backend/package.json`**

```json
{
  "name": "symbiotes-backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "better-sqlite3": "^11.3.0",
    "dotenv": "^16.4.5",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/express": "^4.17.21",
    "@types/node": "^20.16.0",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 5: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 6: Create `backend/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
```

- [ ] **Step 7: Install backend deps**

Run: `npm --prefix backend install`
Expected: dependencies install without error.

- [ ] **Step 8: Write the failing test**

Create `backend/test/config.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

const full = {
  JIRA_BASE_URL: "https://x.atlassian.net",
  JIRA_EMAIL: "me@x.com",
  JIRA_API_TOKEN: "tok",
  GITHUB_TOKEN: "gh",
};

describe("loadConfig", () => {
  it("returns config with default port 3000", () => {
    const cfg = loadConfig(full);
    expect(cfg.jiraBaseUrl).toBe("https://x.atlassian.net");
    expect(cfg.port).toBe(3000);
  });

  it("respects PORT override", () => {
    expect(loadConfig({ ...full, PORT: "4000" }).port).toBe(4000);
  });

  it("throws listing every missing var", () => {
    expect(() => loadConfig({})).toThrow(/JIRA_BASE_URL/);
    expect(() => loadConfig({})).toThrow(/GITHUB_TOKEN/);
  });
});
```

- [ ] **Step 9: Run test to verify it fails**

Run: `npm --prefix backend test`
Expected: FAIL — cannot find module `../src/config.js`.

- [ ] **Step 10: Write `backend/src/config.ts`**

```ts
export interface Config {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  githubToken: string;
  port: number;
}

const REQUIRED = [
  "JIRA_BASE_URL",
  "JIRA_EMAIL",
  "JIRA_API_TOKEN",
  "GITHUB_TOKEN",
] as const;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
  return {
    jiraBaseUrl: env.JIRA_BASE_URL!.replace(/\/$/, ""),
    jiraEmail: env.JIRA_EMAIL!,
    jiraApiToken: env.JIRA_API_TOKEN!,
    githubToken: env.GITHUB_TOKEN!,
    port: env.PORT ? Number(env.PORT) : 3000,
  };
}
```

- [ ] **Step 11: Run test to verify it passes**

Run: `npm --prefix backend test`
Expected: PASS (3 tests).

- [ ] **Step 12: Commit**

```bash
git add .gitignore .env.example package.json backend/package.json backend/tsconfig.json backend/vitest.config.ts backend/src/config.ts backend/test/config.test.ts backend/package-lock.json
git commit -m "feat: scaffold repo and backend config loader"
```

---

### Task 2: Link resolver

**Files:**
- Create: `backend/src/links.ts`
- Test: `backend/test/links.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `extractJiraKey(...texts: (string | null | undefined)[]): string | null` — returns the first `\b[A-Z][A-Z0-9]+-\d+\b` match across the given texts (in order), uppercased, or `null`.
  - `JIRA_KEY_RE: RegExp` — the shared pattern (global, used with `match`).

- [ ] **Step 1: Write the failing test**

Create `backend/test/links.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractJiraKey } from "../src/links.js";

describe("extractJiraKey", () => {
  it("finds a key in a branch name", () => {
    expect(extractJiraKey("feature/RW-1234-add-thing")).toBe("RW-1234");
  });
  it("finds multi-letter project keys", () => {
    expect(extractJiraKey("FRONT-42: fix")).toBe("FRONT-42");
    expect(extractJiraKey("AI-7 spike")).toBe("AI-7");
  });
  it("prefers the first non-null source", () => {
    expect(extractJiraKey(null, "RW-9 from title")).toBe("RW-9");
  });
  it("returns null when no key present", () => {
    expect(extractJiraKey("just-a-branch", "no key here")).toBeNull();
  });
  it("uppercases lowercase input", () => {
    expect(extractJiraKey("rw-1234")).toBe("RW-1234");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test test/links.test.ts`
Expected: FAIL — cannot find module `../src/links.js`.

- [ ] **Step 3: Write `backend/src/links.ts`**

```ts
export const JIRA_KEY_RE = /\b[A-Z][A-Z0-9]+-\d+\b/g;

export function extractJiraKey(
  ...texts: (string | null | undefined)[]
): string | null {
  for (const text of texts) {
    if (!text) continue;
    const match = text.toUpperCase().match(JIRA_KEY_RE);
    if (match && match.length > 0) return match[0];
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix backend test test/links.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/links.ts backend/test/links.test.ts
git commit -m "feat: add Jira key extraction"
```

---

### Task 3: Store interface + SqliteStore

**Files:**
- Create: `backend/src/store.ts`, `backend/src/sqlite-store.ts`
- Test: `backend/test/sqlite-store.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Types:
    `Task = { id: number; title: string; description: string; status: string; created_at: string; updated_at: string }`,
    `Note = { id: number; title: string; description: string; created_at: string; updated_at: string }`,
    `NewTask = { title: string; description?: string; status?: string }`,
    `TaskPatch = { title?: string; description?: string; status?: string }`,
    `NewNote = { title: string; description?: string }`,
    `NotePatch = { title?: string; description?: string }`.
  - `interface Store` with:
    `listTasks(): Task[]`, `createTask(t: NewTask): Task`, `updateTask(id: number, p: TaskPatch): Task | null`, `deleteTask(id: number): boolean`,
    `listNotes(): Note[]`, `createNote(n: NewNote): Note`, `updateNote(id: number, p: NotePatch): Note | null`, `deleteNote(id: number): boolean`.
  - `class SqliteStore implements Store` with constructor `new SqliteStore(filename: string)` (use `":memory:"` in tests). Creates tables if absent.

- [ ] **Step 1: Write the failing test**

Create `backend/test/sqlite-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { SqliteStore } from "../src/sqlite-store.js";

let store: SqliteStore;
beforeEach(() => {
  store = new SqliteStore(":memory:");
});

describe("SqliteStore tasks", () => {
  it("creates with defaults and lists", () => {
    const t = store.createTask({ title: "Follow up with vendor" });
    expect(t.id).toBeGreaterThan(0);
    expect(t.status).toBe("In Progress");
    expect(t.description).toBe("");
    expect(store.listTasks()).toHaveLength(1);
  });

  it("updates a task and bumps updated_at fields exist", () => {
    const t = store.createTask({ title: "A", status: "Responded" });
    const updated = store.updateTask(t.id, { status: "Resolved" });
    expect(updated?.status).toBe("Resolved");
    expect(store.updateTask(9999, { title: "x" })).toBeNull();
  });

  it("deletes a task", () => {
    const t = store.createTask({ title: "A" });
    expect(store.deleteTask(t.id)).toBe(true);
    expect(store.deleteTask(t.id)).toBe(false);
    expect(store.listTasks()).toHaveLength(0);
  });
});

describe("SqliteStore notes", () => {
  it("creates, updates, deletes notes", () => {
    const n = store.createNote({ title: "Run job first thing" });
    expect(n.id).toBeGreaterThan(0);
    expect(store.updateNote(n.id, { description: "the ETL job" })?.description).toBe("the ETL job");
    expect(store.deleteNote(n.id)).toBe(true);
    expect(store.listNotes()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test test/sqlite-store.test.ts`
Expected: FAIL — cannot find module `../src/sqlite-store.js`.

- [ ] **Step 3: Write `backend/src/store.ts`**

```ts
export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface NewTask { title: string; description?: string; status?: string; }
export interface TaskPatch { title?: string; description?: string; status?: string; }
export interface NewNote { title: string; description?: string; }
export interface NotePatch { title?: string; description?: string; }

export interface Store {
  listTasks(): Task[];
  createTask(t: NewTask): Task;
  updateTask(id: number, p: TaskPatch): Task | null;
  deleteTask(id: number): boolean;

  listNotes(): Note[];
  createNote(n: NewNote): Note;
  updateNote(id: number, p: NotePatch): Note | null;
  deleteNote(id: number): boolean;
}
```

- [ ] **Step 4: Write `backend/src/sqlite-store.ts`**

```ts
import Database from "better-sqlite3";
import type {
  Store, Task, Note, NewTask, TaskPatch, NewNote, NotePatch,
} from "./store.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'In Progress',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
`;

export class SqliteStore implements Store {
  private db: Database.Database;

  constructor(filename: string) {
    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA);
  }

  private now(): string { return new Date().toISOString(); }

  listTasks(): Task[] {
    return this.db.prepare("SELECT * FROM tasks ORDER BY updated_at DESC").all() as Task[];
  }

  createTask(t: NewTask): Task {
    const now = this.now();
    const info = this.db
      .prepare(
        "INSERT INTO tasks (title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(t.title, t.description ?? "", t.status ?? "In Progress", now, now);
    return this.getTask(Number(info.lastInsertRowid))!;
  }

  updateTask(id: number, p: TaskPatch): Task | null {
    const existing = this.getTask(id);
    if (!existing) return null;
    const next = {
      title: p.title ?? existing.title,
      description: p.description ?? existing.description,
      status: p.status ?? existing.status,
    };
    this.db
      .prepare("UPDATE tasks SET title=?, description=?, status=?, updated_at=? WHERE id=?")
      .run(next.title, next.description, next.status, this.now(), id);
    return this.getTask(id);
  }

  deleteTask(id: number): boolean {
    return this.db.prepare("DELETE FROM tasks WHERE id=?").run(id).changes > 0;
  }

  listNotes(): Note[] {
    return this.db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all() as Note[];
  }

  createNote(n: NewNote): Note {
    const now = this.now();
    const info = this.db
      .prepare("INSERT INTO notes (title, description, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .run(n.title, n.description ?? "", now, now);
    return this.getNote(Number(info.lastInsertRowid))!;
  }

  updateNote(id: number, p: NotePatch): Note | null {
    const existing = this.getNote(id);
    if (!existing) return null;
    const next = {
      title: p.title ?? existing.title,
      description: p.description ?? existing.description,
    };
    this.db
      .prepare("UPDATE notes SET title=?, description=?, updated_at=? WHERE id=?")
      .run(next.title, next.description, this.now(), id);
    return this.getNote(id);
  }

  deleteNote(id: number): boolean {
    return this.db.prepare("DELETE FROM notes WHERE id=?").run(id).changes > 0;
  }

  private getTask(id: number): Task | null {
    return (this.db.prepare("SELECT * FROM tasks WHERE id=?").get(id) as Task) ?? null;
  }
  private getNote(id: number): Note | null {
    return (this.db.prepare("SELECT * FROM notes WHERE id=?").get(id) as Note) ?? null;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix backend test test/sqlite-store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/store.ts backend/src/sqlite-store.ts backend/test/sqlite-store.test.ts
git commit -m "feat: add Store interface and SqliteStore"
```

---

### Task 4: Jira + GitHub clients

**Files:**
- Create: `backend/src/jira.ts`, `backend/src/github.ts`
- Test: `backend/test/clients.test.ts`

**Interfaces:**
- Consumes: `Config` from `config.ts`.
- Produces:
  - Types: `JiraTicket = { key: string; title: string; status: string }`, `Pr = { number: number; title: string; repo: string; url: string; branch: string }`.
  - `fetchMyTickets(cfg: Config, fetchImpl?: typeof fetch): Promise<JiraTicket[]>` — JQL `assignee = currentUser() AND statusCategory != Done`, throws on non-OK response.
  - `fetchMyOpenPrs(cfg: Config, fetchImpl?: typeof fetch): Promise<Pr[]>` — GitHub search `is:pr is:open author:@me`, throws on non-OK response.
  - The `fetchImpl` param lets tests inject a stub; defaults to global `fetch`.

- [ ] **Step 1: Write the failing test**

Create `backend/test/clients.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { fetchMyTickets } from "../src/jira.js";
import { fetchMyOpenPrs } from "../src/github.js";
import type { Config } from "../src/config.js";

const cfg: Config = {
  jiraBaseUrl: "https://x.atlassian.net",
  jiraEmail: "me@x.com",
  jiraApiToken: "tok",
  githubToken: "gh",
  port: 3000,
};

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

describe("fetchMyTickets", () => {
  it("maps Jira issues to tickets", async () => {
    const stub = vi.fn(async () =>
      jsonResponse({
        issues: [
          { key: "RW-1", fields: { summary: "Fix login", status: { name: "In Progress" } } },
        ],
      })
    );
    const tickets = await fetchMyTickets(cfg, stub as unknown as typeof fetch);
    expect(tickets).toEqual([{ key: "RW-1", title: "Fix login", status: "In Progress" }]);
  });

  it("throws on a non-OK response", async () => {
    const stub = vi.fn(async () => jsonResponse({}, false));
    await expect(fetchMyTickets(cfg, stub as unknown as typeof fetch)).rejects.toThrow(/Jira/);
  });
});

describe("fetchMyOpenPrs", () => {
  it("maps GitHub search items to PRs", async () => {
    const stub = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            number: 42,
            title: "RW-1 add login",
            html_url: "https://github.com/o/r/pull/42",
            repository_url: "https://api.github.com/repos/o/r",
            pull_request: { html_url: "x" },
            head: undefined,
          },
        ],
      })
    );
    const prs = await fetchMyOpenPrs(cfg, stub as unknown as typeof fetch);
    expect(prs[0]).toMatchObject({ number: 42, title: "RW-1 add login", repo: "o/r" });
  });

  it("throws on a non-OK response", async () => {
    const stub = vi.fn(async () => jsonResponse({}, false));
    await expect(fetchMyOpenPrs(cfg, stub as unknown as typeof fetch)).rejects.toThrow(/GitHub/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test test/clients.test.ts`
Expected: FAIL — cannot find modules `../src/jira.js` / `../src/github.js`.

- [ ] **Step 3: Write `backend/src/jira.ts`**

```ts
import type { Config } from "./config.js";

export interface JiraTicket {
  key: string;
  title: string;
  status: string;
}

interface JiraIssue {
  key: string;
  fields: { summary: string; status: { name: string } };
}

export async function fetchMyTickets(
  cfg: Config,
  fetchImpl: typeof fetch = fetch
): Promise<JiraTicket[]> {
  const jql = "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC";
  const url = `${cfg.jiraBaseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,status&maxResults=100`;
  const auth = Buffer.from(`${cfg.jiraEmail}:${cfg.jiraApiToken}`).toString("base64");
  const res = await fetchImpl(url, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Jira request failed: ${res.status}`);
  const body = (await res.json()) as { issues: JiraIssue[] };
  return body.issues.map((i) => ({
    key: i.key,
    title: i.fields.summary,
    status: i.fields.status.name,
  }));
}
```

- [ ] **Step 4: Write `backend/src/github.ts`**

```ts
import type { Config } from "./config.js";

export interface Pr {
  number: number;
  title: string;
  repo: string;
  url: string;
  branch: string;
}

interface SearchItem {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  pull_request?: { html_url: string };
}

export async function fetchMyOpenPrs(
  cfg: Config,
  fetchImpl: typeof fetch = fetch
): Promise<Pr[]> {
  const q = encodeURIComponent("is:pr is:open author:@me");
  const url = `https://api.github.com/search/issues?q=${q}&per_page=100`;
  const res = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${cfg.githubToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "symbiotes",
    },
  });
  if (!res.ok) throw new Error(`GitHub request failed: ${res.status}`);
  const body = (await res.json()) as { items: SearchItem[] };
  return body.items.map((it) => ({
    number: it.number,
    title: it.title,
    repo: it.repository_url.replace("https://api.github.com/repos/", ""),
    url: it.html_url,
    branch: "",
  }));
}
```

Note: the GitHub search API does not return the branch name; `branch` is left empty and the Jira key is parsed from the PR title (sufficient given team naming). The `branch` field is retained in the type for a future enrichment call.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix backend test test/clients.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/jira.ts backend/src/github.ts backend/test/clients.test.ts
git commit -m "feat: add Jira and GitHub clients"
```

---

### Task 5: Dashboard route (combine + link + resilience)

**Files:**
- Create: `backend/src/routes/dashboard.ts`, `backend/src/app.ts`
- Test: `backend/test/dashboard.test.ts`

**Interfaces:**
- Consumes: `fetchMyTickets`, `fetchMyOpenPrs`, `extractJiraKey`, `Store`.
- Produces:
  - Types:
    `DashTicket = JiraTicket & { pr: number | null }`,
    `DashPr = Pr & { jiraKey: string | null }`,
    `DashboardResponse = { tickets: DashTicket[]; prs: DashPr[]; errors: { jira: string | null; github: string | null } }`.
  - `buildDashboard(deps): Promise<DashboardResponse>` where `deps = { getTickets: () => Promise<JiraTicket[]>; getPrs: () => Promise<Pr[]> }`. Each source is caught independently: a thrown source yields `[]` plus a populated `errors.<source>` string; links are resolved from whatever data is present.
  - `createApp(opts): express.Express` where `opts = { store: Store; getTickets: () => Promise<JiraTicket[]>; getPrs: () => Promise<Pr[]> }`. Mounts `GET /api/dashboard` now; later tasks add task/note routers to the same factory.

- [ ] **Step 1: Write the failing test**

Create `backend/test/dashboard.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SqliteStore } from "../src/sqlite-store.js";
import type { JiraTicket } from "../src/jira.js";
import type { Pr } from "../src/github.js";

const tickets: JiraTicket[] = [{ key: "RW-1", title: "Fix login", status: "In Progress" }];
const prs: Pr[] = [
  { number: 42, title: "RW-1 add login", repo: "o/r", url: "u", branch: "" },
  { number: 43, title: "chore: bump deps", repo: "o/r", url: "u2", branch: "" },
];

function app(over: Partial<{ getTickets: () => Promise<JiraTicket[]>; getPrs: () => Promise<Pr[]> }> = {}) {
  return createApp({
    store: new SqliteStore(":memory:"),
    getTickets: over.getTickets ?? (async () => tickets),
    getPrs: over.getPrs ?? (async () => prs),
  });
}

describe("GET /api/dashboard", () => {
  it("links PRs to tickets both directions", async () => {
    const res = await request(app()).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.tickets[0]).toEqual({ key: "RW-1", title: "Fix login", status: "In Progress", pr: 42 });
    expect(res.body.prs.find((p: any) => p.number === 42).jiraKey).toBe("RW-1");
    expect(res.body.prs.find((p: any) => p.number === 43).jiraKey).toBeNull();
    expect(res.body.errors).toEqual({ jira: null, github: null });
  });

  it("survives a failing Jira source", async () => {
    const res = await request(
      app({ getTickets: async () => { throw new Error("boom"); } })
    ).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.tickets).toEqual([]);
    expect(res.body.errors.jira).toMatch(/boom/);
    expect(res.body.prs).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test test/dashboard.test.ts`
Expected: FAIL — cannot find module `../src/app.js`.

- [ ] **Step 3: Write `backend/src/routes/dashboard.ts`**

```ts
import { Router } from "express";
import type { JiraTicket } from "../jira.js";
import type { Pr } from "../github.js";
import { extractJiraKey } from "../links.js";

export interface DashTicket extends JiraTicket { pr: number | null; }
export interface DashPr extends Pr { jiraKey: string | null; }
export interface DashboardResponse {
  tickets: DashTicket[];
  prs: DashPr[];
  errors: { jira: string | null; github: string | null };
}

export interface DashboardDeps {
  getTickets: () => Promise<JiraTicket[]>;
  getPrs: () => Promise<Pr[]>;
}

export async function buildDashboard(deps: DashboardDeps): Promise<DashboardResponse> {
  const errors: DashboardResponse["errors"] = { jira: null, github: null };

  let tickets: JiraTicket[] = [];
  try { tickets = await deps.getTickets(); }
  catch (e) { errors.jira = e instanceof Error ? e.message : String(e); }

  let prs: Pr[] = [];
  try { prs = await deps.getPrs(); }
  catch (e) { errors.github = e instanceof Error ? e.message : String(e); }

  const dashPrs: DashPr[] = prs.map((p) => ({ ...p, jiraKey: extractJiraKey(p.branch, p.title) }));
  const dashTickets: DashTicket[] = tickets.map((t) => ({
    ...t,
    pr: dashPrs.find((p) => p.jiraKey === t.key)?.number ?? null,
  }));

  return { tickets: dashTickets, prs: dashPrs, errors };
}

export function dashboardRouter(deps: DashboardDeps): Router {
  const router = Router();
  router.get("/", async (_req, res) => {
    res.json(await buildDashboard(deps));
  });
  return router;
}
```

- [ ] **Step 4: Write `backend/src/app.ts`**

```ts
import express from "express";
import type { Store } from "./store.js";
import type { JiraTicket } from "./jira.js";
import type { Pr } from "./github.js";
import { dashboardRouter } from "./routes/dashboard.js";

export interface AppOptions {
  store: Store;
  getTickets: () => Promise<JiraTicket[]>;
  getPrs: () => Promise<Pr[]>;
}

export function createApp(opts: AppOptions): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api/dashboard", dashboardRouter({ getTickets: opts.getTickets, getPrs: opts.getPrs }));
  return app;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix backend test test/dashboard.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/dashboard.ts backend/src/app.ts backend/test/dashboard.test.ts
git commit -m "feat: add dashboard route with resilient link resolution"
```

---

### Task 6: Tasks + Notes CRUD routes

**Files:**
- Create: `backend/src/routes/tasks.ts`, `backend/src/routes/notes.ts`
- Modify: `backend/src/app.ts` (mount the two routers)
- Test: `backend/test/tasks.test.ts`, `backend/test/notes.test.ts`

**Interfaces:**
- Consumes: `Store`.
- Produces:
  - `tasksRouter(store: Store): Router` mounted at `/api/tasks`: `GET /` → `Task[]`; `POST /` (body `NewTask`, 400 if no `title`) → `201 Task`; `PUT /:id` (body `TaskPatch`) → `Task` or `404`; `DELETE /:id` → `204` or `404`.
  - `notesRouter(store: Store): Router` mounted at `/api/notes`: same shape with `NewNote`/`NotePatch`.

- [ ] **Step 1: Write the failing tests**

Create `backend/test/tasks.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SqliteStore } from "../src/sqlite-store.js";

function app() {
  return createApp({
    store: new SqliteStore(":memory:"),
    getTickets: async () => [],
    getPrs: async () => [],
  });
}

describe("tasks CRUD", () => {
  it("creates, lists, updates, deletes", async () => {
    const a = app();
    const created = await request(a).post("/api/tasks").send({ title: "Chase vendor" });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("In Progress");
    const id = created.body.id;

    const list = await request(a).get("/api/tasks");
    expect(list.body).toHaveLength(1);

    const upd = await request(a).put(`/api/tasks/${id}`).send({ status: "Resolved" });
    expect(upd.body.status).toBe("Resolved");

    expect((await request(a).delete(`/api/tasks/${id}`)).status).toBe(204);
    expect((await request(a).put(`/api/tasks/${id}`).send({ title: "x" })).status).toBe(404);
  });

  it("rejects a task without a title", async () => {
    expect((await request(app()).post("/api/tasks").send({})).status).toBe(400);
  });
});
```

Create `backend/test/notes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SqliteStore } from "../src/sqlite-store.js";

function app() {
  return createApp({
    store: new SqliteStore(":memory:"),
    getTickets: async () => [],
    getPrs: async () => [],
  });
}

describe("notes CRUD", () => {
  it("creates, updates, deletes", async () => {
    const a = app();
    const created = await request(a).post("/api/notes").send({ title: "Run job AM" });
    expect(created.status).toBe(201);
    const id = created.body.id;
    const upd = await request(a).put(`/api/notes/${id}`).send({ description: "ETL" });
    expect(upd.body.description).toBe("ETL");
    expect((await request(a).delete(`/api/notes/${id}`)).status).toBe(204);
  });

  it("rejects a note without a title", async () => {
    expect((await request(app()).post("/api/notes").send({})).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix backend test test/tasks.test.ts test/notes.test.ts`
Expected: FAIL — routes return 404 (routers not mounted).

- [ ] **Step 3: Write `backend/src/routes/tasks.ts`**

```ts
import { Router } from "express";
import type { Store } from "../store.js";

export function tasksRouter(store: Store): Router {
  const router = Router();

  router.get("/", (_req, res) => res.json(store.listTasks()));

  router.post("/", (req, res) => {
    const { title, description, status } = req.body ?? {};
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title is required" });
    }
    res.status(201).json(store.createTask({ title, description, status }));
  });

  router.put("/:id", (req, res) => {
    const { title, description, status } = req.body ?? {};
    const updated = store.updateTask(Number(req.params.id), { title, description, status });
    if (!updated) return res.status(404).json({ error: "not found" });
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    if (!store.deleteTask(Number(req.params.id))) return res.status(404).end();
    res.status(204).end();
  });

  return router;
}
```

- [ ] **Step 4: Write `backend/src/routes/notes.ts`**

```ts
import { Router } from "express";
import type { Store } from "../store.js";

export function notesRouter(store: Store): Router {
  const router = Router();

  router.get("/", (_req, res) => res.json(store.listNotes()));

  router.post("/", (req, res) => {
    const { title, description } = req.body ?? {};
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title is required" });
    }
    res.status(201).json(store.createNote({ title, description }));
  });

  router.put("/:id", (req, res) => {
    const { title, description } = req.body ?? {};
    const updated = store.updateNote(Number(req.params.id), { title, description });
    if (!updated) return res.status(404).json({ error: "not found" });
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    if (!store.deleteNote(Number(req.params.id))) return res.status(404).end();
    res.status(204).end();
  });

  return router;
}
```

- [ ] **Step 5: Mount routers in `backend/src/app.ts`**

Replace the file body with:

```ts
import express from "express";
import type { Store } from "./store.js";
import type { JiraTicket } from "./jira.js";
import type { Pr } from "./github.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { tasksRouter } from "./routes/tasks.js";
import { notesRouter } from "./routes/notes.js";

export interface AppOptions {
  store: Store;
  getTickets: () => Promise<JiraTicket[]>;
  getPrs: () => Promise<Pr[]>;
}

export function createApp(opts: AppOptions): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api/dashboard", dashboardRouter({ getTickets: opts.getTickets, getPrs: opts.getPrs }));
  app.use("/api/tasks", tasksRouter(opts.store));
  app.use("/api/notes", notesRouter(opts.store));
  return app;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm --prefix backend test`
Expected: PASS (all backend suites green).

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/tasks.ts backend/src/routes/notes.ts backend/src/app.ts backend/test/tasks.test.ts backend/test/notes.test.ts
git commit -m "feat: add tasks and notes CRUD routes"
```

---

### Task 7: Backend server entrypoint

**Files:**
- Create: `backend/src/server.ts`

**Interfaces:**
- Consumes: `loadConfig`, `createApp`, `SqliteStore`, `fetchMyTickets`, `fetchMyOpenPrs`.
- Produces: a runnable process binding `127.0.0.1:<port>`. No test (thin wiring; logic lives in tested units).

- [ ] **Step 1: Write `backend/src/server.ts`**

```ts
import "dotenv/config";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { SqliteStore } from "./sqlite-store.js";
import { fetchMyTickets } from "./jira.js";
import { fetchMyOpenPrs } from "./github.js";

const cfg = loadConfig(process.env);
const store = new SqliteStore("symbiotes.db");

const app = createApp({
  store,
  getTickets: () => fetchMyTickets(cfg),
  getPrs: () => fetchMyOpenPrs(cfg),
});

app.listen(cfg.port, "127.0.0.1", () => {
  console.log(`Symbiotes backend on http://127.0.0.1:${cfg.port}`);
});
```

- [ ] **Step 2: Smoke-test startup (manual)**

Run: `cp .env.example .env` then fill real values, then `npm --prefix backend start`.
Expected: logs `Symbiotes backend on http://127.0.0.1:3000`. `curl localhost:3000/api/tasks` returns `[]`. Stop with Ctrl-C.

- [ ] **Step 3: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: add backend server entrypoint"
```

---

### Task 8: Frontend scaffold + API client + theme

**Files:**
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`
- Create: `frontend/src/main.tsx`, `frontend/src/api.ts`, `frontend/src/theme.css`
- Create: `frontend/src/App.tsx` (placeholder shell, replaced in Task 9)

**Interfaces:**
- Consumes: backend HTTP API.
- Produces:
  - `api.ts` exporting types `JiraTicketView`, `PrView`, `TaskView`, `NoteView`, `DashboardResponse` and functions:
    `getDashboard(): Promise<DashboardResponse>`,
    `listTasks/createTask/updateTask/deleteTask`, `listNotes/createNote/updateNote/deleteNote`.
  - Vite dev server on `5173` proxying `/api` → `localhost:3000`.
  - `theme.css` with dark palette and a `.row` class implementing the row-spacing rule.

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "symbiotes-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `frontend/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3000" },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
```

- [ ] **Step 4: Create `frontend/src/test-setup.ts`**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Symbiotes</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `frontend/src/theme.css`**

```css
:root {
  --bg: #0f1115;
  --panel: #171a21;
  --border: #262b36;
  --text: #e6e8ec;
  --muted: #9aa3b2;
  --accent: #5b9dff;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-bottom: 1px solid var(--border);
}
.grid {
  display: grid; gap: 16px; padding: 24px;
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
.box {
  background: var(--panel); border: 1px solid var(--border);
  border-radius: 10px; padding: 16px; min-height: 200px;
}
.box h2 { margin: 0 0 12px; font-size: 15px; }
/* Row spacing rule: 1rem below each row, none on the last. */
.row { margin-bottom: 1rem; }
.row:last-child { margin-bottom: 0; }
.muted { color: var(--muted); }
button {
  background: var(--accent); color: #fff; border: 0;
  border-radius: 6px; padding: 6px 12px; cursor: pointer;
}
button.secondary { background: transparent; border: 1px solid var(--border); color: var(--text); }
input, textarea, select {
  width: 100%; background: var(--bg); color: var(--text);
  border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px;
}
a { color: var(--accent); }
.error { color: #ff6b6b; }
```

- [ ] **Step 7: Create `frontend/src/api.ts`**

```ts
export interface JiraTicketView { key: string; title: string; status: string; pr: number | null; }
export interface PrView { number: number; title: string; repo: string; url: string; branch: string; jiraKey: string | null; }
export interface DashboardResponse {
  tickets: JiraTicketView[];
  prs: PrView[];
  errors: { jira: string | null; github: string | null };
}
export interface TaskView { id: number; title: string; description: string; status: string; created_at: string; updated_at: string; }
export interface NoteView { id: number; title: string; description: string; created_at: string; updated_at: string; }

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const getDashboard = () => fetch("/api/dashboard").then(json<DashboardResponse>);

export const listTasks = () => fetch("/api/tasks").then(json<TaskView[]>);
export const createTask = (b: { title: string; description?: string; status?: string }) =>
  fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<TaskView>);
export const updateTask = (id: number, b: Partial<{ title: string; description: string; status: string }>) =>
  fetch(`/api/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<TaskView>);
export const deleteTask = (id: number) => fetch(`/api/tasks/${id}`, { method: "DELETE" });

export const listNotes = () => fetch("/api/notes").then(json<NoteView[]>);
export const createNote = (b: { title: string; description?: string }) =>
  fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<NoteView>);
export const updateNote = (id: number, b: Partial<{ title: string; description: string }>) =>
  fetch(`/api/notes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<NoteView>);
export const deleteNote = (id: number) => fetch(`/api/notes/${id}`, { method: "DELETE" });

export const TASK_STATUSES = ["In Progress", "Responded", "Waiting on third party", "Resolved"] as const;
```

- [ ] **Step 8: Create placeholder `frontend/src/App.tsx`**

```tsx
export default function App() {
  return <div className="topbar"><strong>Symbiotes</strong></div>;
}
```

- [ ] **Step 9: Create `frontend/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./theme.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 10: Install frontend deps and verify it builds**

Run: `npm --prefix frontend install && npm --prefix frontend run build`
Expected: install succeeds; `tsc` reports no errors; Vite produces a `dist/` bundle.

- [ ] **Step 11: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html frontend/src/test-setup.ts frontend/src/theme.css frontend/src/api.ts frontend/src/App.tsx frontend/src/main.tsx frontend/package-lock.json
git commit -m "feat: scaffold frontend with API client and dark theme"
```

---

### Task 9: Dashboard shell + read-only Jira/PR boxes

**Files:**
- Create: `frontend/src/components/Box.tsx`, `frontend/src/components/JiraBox.tsx`, `frontend/src/components/PrBox.tsx`
- Modify: `frontend/src/App.tsx` (real shell: load on mount, Refresh button, 4-box grid)

**Interfaces:**
- Consumes: `getDashboard`, `DashboardResponse` from `api.ts`.
- Produces:
  - `Box({ title, children }): JSX.Element` — the shared panel shell (`.box` + `<h2>`).
  - `JiraBox({ tickets, error }): JSX.Element` and `PrBox({ prs, error }): JSX.Element` — render rows using the `.row` class; show an empty-state and an error line.
  - `App` fetches the dashboard on mount and on Refresh, holds tasks/notes state for Task 10/11 (passed down later).

- [ ] **Step 1: Write `frontend/src/components/Box.tsx`**

```tsx
import type { ReactNode } from "react";

export function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="box">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Write `frontend/src/components/JiraBox.tsx`**

```tsx
import type { JiraTicketView } from "../api.js";
import { Box } from "./Box.js";

export function JiraBox({ tickets, error }: { tickets: JiraTicketView[]; error: string | null }) {
  return (
    <Box title="My Jira Tickets">
      {error && <div className="error row">Jira error: {error}</div>}
      {!error && tickets.length === 0 && <div className="muted">No assigned tickets.</div>}
      {tickets.map((t) => (
        <div className="row" key={t.key}>
          <strong>{t.key}</strong> {t.title}{" "}
          <span className="muted">· {t.status}</span>
          {t.pr != null && <span className="muted"> · PR #{t.pr}</span>}
        </div>
      ))}
    </Box>
  );
}
```

- [ ] **Step 3: Write `frontend/src/components/PrBox.tsx`**

```tsx
import type { PrView } from "../api.js";
import { Box } from "./Box.js";

export function PrBox({ prs, error }: { prs: PrView[]; error: string | null }) {
  return (
    <Box title="My Open PRs">
      {error && <div className="error row">GitHub error: {error}</div>}
      {!error && prs.length === 0 && <div className="muted">No open PRs.</div>}
      {prs.map((p) => (
        <div className="row" key={`${p.repo}#${p.number}`}>
          <a href={p.url} target="_blank" rel="noreferrer">#{p.number}</a> {p.title}{" "}
          {p.jiraKey ? <span className="muted">· {p.jiraKey}</span> : <span className="muted">· no ticket</span>}
        </div>
      ))}
    </Box>
  );
}
```

- [ ] **Step 4: Rewrite `frontend/src/App.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { getDashboard, type DashboardResponse } from "./api.js";
import { JiraBox } from "./components/JiraBox.js";
import { PrBox } from "./components/PrBox.js";

const EMPTY: DashboardResponse = { tickets: [], prs: [], errors: { jira: null, github: null } };

export default function App() {
  const [dash, setDash] = useState<DashboardResponse>(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setDash(await getDashboard()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <>
      <div className="topbar">
        <strong>Symbiotes</strong>
        <button onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="grid">
        <JiraBox tickets={dash.tickets} error={dash.errors.jira} />
        <PrBox prs={dash.prs} error={dash.errors.github} />
        <section className="box"><h2>Untracked Tasks</h2><div className="muted">Coming next.</div></section>
        <section className="box"><h2>Quick Notes</h2><div className="muted">Coming next.</div></section>
      </div>
    </>
  );
}
```

Note: `useCallback` is imported from `react` (correct the import to `import { useCallback, useEffect, useState } from "react";` — already shown).

- [ ] **Step 5: Verify it builds**

Run: `npm --prefix frontend run build`
Expected: `tsc` clean, bundle produced.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Box.tsx frontend/src/components/JiraBox.tsx frontend/src/components/PrBox.tsx frontend/src/App.tsx
git commit -m "feat: add dashboard shell with Jira and PR boxes"
```

---

### Task 10: Tasks box (CRUD UI)

**Files:**
- Create: `frontend/src/components/TasksBox.tsx`
- Modify: `frontend/src/App.tsx` (load tasks, render `TasksBox`)
- Test: `frontend/src/components/__tests__/TasksBox.test.tsx`

**Interfaces:**
- Consumes: `TaskView`, `TASK_STATUSES`, `createTask`, `updateTask`, `deleteTask`, `listTasks`.
- Produces: `TasksBox({ tasks, onChange }): JSX.Element` where `onChange: () => void` re-fetches after any mutation. Add form (title + status), per-row status dropdown + delete.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/__tests__/TasksBox.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TasksBox } from "../TasksBox.js";
import * as api from "../../api.js";

beforeEach(() => vi.restoreAllMocks());

const tasks = [
  { id: 1, title: "Chase vendor", description: "", status: "In Progress", created_at: "", updated_at: "" },
];

describe("TasksBox", () => {
  it("renders tasks and adds one", async () => {
    const onChange = vi.fn();
    const createSpy = vi.spyOn(api, "createTask").mockResolvedValue({ ...tasks[0], id: 2, title: "New" });
    render(<TasksBox tasks={tasks} onChange={onChange} />);

    expect(screen.getByText("Chase vendor")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("New task title"), "New");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(createSpy).toHaveBeenCalledWith({ title: "New", status: "In Progress" });
    expect(onChange).toHaveBeenCalled();
  });

  it("deletes a task", async () => {
    const onChange = vi.fn();
    const delSpy = vi.spyOn(api, "deleteTask").mockResolvedValue(new Response(null, { status: 204 }));
    render(<TasksBox tasks={tasks} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Chase vendor" }));
    expect(delSpy).toHaveBeenCalledWith(1);
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test src/components/__tests__/TasksBox.test.tsx`
Expected: FAIL — cannot find module `../TasksBox.js`.

- [ ] **Step 3: Write `frontend/src/components/TasksBox.tsx`**

```tsx
import { useState } from "react";
import { Box } from "./Box.js";
import { TASK_STATUSES, createTask, updateTask, deleteTask, type TaskView } from "../api.js";

export function TasksBox({ tasks, onChange }: { tasks: TaskView[]; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string>(TASK_STATUSES[0]);

  async function add() {
    if (!title.trim()) return;
    await createTask({ title: title.trim(), status });
    setTitle("");
    setStatus(TASK_STATUSES[0]);
    onChange();
  }

  async function setRowStatus(id: number, next: string) {
    await updateTask(id, { status: next });
    onChange();
  }

  async function remove(id: number) {
    await deleteTask(id);
    onChange();
  }

  return (
    <Box title="Untracked Tasks">
      <div className="row">
        <input
          placeholder="New task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => void add()}>Add</button>
        </div>
      </div>
      {tasks.length === 0 && <div className="muted">Nothing untracked right now.</div>}
      {tasks.map((t) => (
        <div className="row" key={t.id}>
          <div><strong>{t.title}</strong></div>
          {t.description && <div className="muted">{t.description}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <select value={t.status} onChange={(e) => void setRowStatus(t.id, e.target.value)}>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="secondary" aria-label={`Delete ${t.title}`} onClick={() => void remove(t.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </Box>
  );
}
```

- [ ] **Step 4: Wire into `App.tsx`**

Add to the imports:

```tsx
import { listTasks, type TaskView } from "./api.js";
import { TasksBox } from "./components/TasksBox.js";
```

Add task state + loader inside `App` (alongside the dashboard state):

```tsx
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const loadTasks = useCallback(async () => setTasks(await listTasks()), []);
  useEffect(() => { void loadTasks(); }, [loadTasks]);
```

Replace the Untracked Tasks placeholder `<section>` with:

```tsx
        <TasksBox tasks={tasks} onChange={() => void loadTasks()} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix frontend test src/components/__tests__/TasksBox.test.tsx`
Expected: PASS (2 tests). Then `npm --prefix frontend run build` is clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/TasksBox.tsx frontend/src/components/__tests__/TasksBox.test.tsx frontend/src/App.tsx
git commit -m "feat: add untracked tasks box with CRUD"
```

---

### Task 11: Notes box (CRUD UI) + final wiring

**Files:**
- Create: `frontend/src/components/NotesBox.tsx`
- Modify: `frontend/src/App.tsx` (load notes, render `NotesBox`)
- Test: `frontend/src/components/__tests__/NotesBox.test.tsx`
- Create: `README.md`

**Interfaces:**
- Consumes: `NoteView`, `createNote`, `updateNote`, `deleteNote`, `listNotes`.
- Produces: `NotesBox({ notes, onChange }): JSX.Element` — add form (title), each row click-to-expand description with edit + delete.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/__tests__/NotesBox.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesBox } from "../NotesBox.js";
import * as api from "../../api.js";

beforeEach(() => vi.restoreAllMocks());

const notes = [
  { id: 1, title: "Run job AM", description: "the ETL job", created_at: "", updated_at: "" },
];

describe("NotesBox", () => {
  it("renders notes and expands description on click", async () => {
    render(<NotesBox notes={notes} onChange={vi.fn()} />);
    expect(screen.queryByText("the ETL job")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Run job AM"));
    expect(screen.getByText("the ETL job")).toBeInTheDocument();
  });

  it("adds a note", async () => {
    const onChange = vi.fn();
    const createSpy = vi.spyOn(api, "createNote").mockResolvedValue({ ...notes[0], id: 2, title: "New note" });
    render(<NotesBox notes={notes} onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText("New note title"), "New note");
    await userEvent.click(screen.getByRole("button", { name: "Add Note" }));
    expect(createSpy).toHaveBeenCalledWith({ title: "New note" });
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test src/components/__tests__/NotesBox.test.tsx`
Expected: FAIL — cannot find module `../NotesBox.js`.

- [ ] **Step 3: Write `frontend/src/components/NotesBox.tsx`**

```tsx
import { useState } from "react";
import { Box } from "./Box.js";
import { createNote, deleteNote, type NoteView } from "../api.js";

export function NotesBox({ notes, onChange }: { notes: NoteView[]; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  async function add() {
    if (!title.trim()) return;
    await createNote({ title: title.trim() });
    setTitle("");
    onChange();
  }

  async function remove(id: number) {
    await deleteNote(id);
    onChange();
  }

  return (
    <Box title="Quick Notes">
      <div className="row" style={{ display: "flex", gap: 8 }}>
        <input placeholder="New note title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button onClick={() => void add()}>Add Note</button>
      </div>
      {notes.length === 0 && <div className="muted">No notes.</div>}
      {notes.map((n) => (
        <div className="row" key={n.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong style={{ cursor: "pointer" }} onClick={() => setOpenId(openId === n.id ? null : n.id)}>
              {n.title}
            </strong>
            <button className="secondary" aria-label={`Delete ${n.title}`} onClick={() => void remove(n.id)}>
              Delete
            </button>
          </div>
          {openId === n.id && <div className="muted" style={{ marginTop: 4 }}>{n.description || "(no description)"}</div>}
        </div>
      ))}
    </Box>
  );
}
```

- [ ] **Step 4: Wire into `App.tsx`**

Add imports:

```tsx
import { listNotes, type NoteView } from "./api.js";
import { NotesBox } from "./components/NotesBox.js";
```

Add notes state + loader:

```tsx
  const [notes, setNotes] = useState<NoteView[]>([]);
  const loadNotes = useCallback(async () => setNotes(await listNotes()), []);
  useEffect(() => { void loadNotes(); }, [loadNotes]);
```

Replace the Quick Notes placeholder `<section>` with:

```tsx
        <NotesBox notes={notes} onChange={() => void loadNotes()} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix frontend test`
Expected: PASS (all frontend suites). Then `npm --prefix frontend run build` is clean.

- [ ] **Step 6: Write `README.md`**

````markdown
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
````

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/NotesBox.tsx frontend/src/components/__tests__/NotesBox.test.tsx frontend/src/App.tsx README.md
git commit -m "feat: add quick notes box and project README"
```

---

## Final Verification

- [ ] `npm test` from the repo root is green (backend + frontend).
- [ ] `npm run dev` starts both; the dashboard loads at `localhost:5173`, shows real Jira tickets and PRs (with cross-links), and tasks/notes CRUD persists across a refresh.
- [ ] Killing the Jira token (temporarily) shows a Jira error in Box 1 while Boxes 2–4 still work — confirms resilience.
