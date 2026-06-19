import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { SqliteStore } from "./sqlite-store.js";
import { fetchMyTickets } from "./jira.js";
import { fetchMyOpenPrs } from "./github.js";

// Load the repo-root .env regardless of the process working directory.
// This file lives at backend/src/server.ts, so the repo root is two levels up.
const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../../.env") });

const cfg = loadConfig(process.env);
const store = new SqliteStore(resolve(here, "..", "symbiotes.db"));

const app = createApp({
  store,
  getTickets: () => fetchMyTickets(cfg),
  getPrs: () => fetchMyOpenPrs(cfg),
});

app.listen(cfg.port, "127.0.0.1", () => {
  console.log(`Symbiotes backend on http://127.0.0.1:${cfg.port}`);
});
