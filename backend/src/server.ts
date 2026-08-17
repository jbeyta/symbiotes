import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { SqliteStore } from "./sqlite-store.js";
import { fetchMyTickets } from "./jira.js";
import { fetchMyOpenPrs } from "./github.js";

// Load the repo-root .env regardless of the process working directory.
const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../../.env") });

const cfg = loadConfig(process.env);
const store = new SqliteStore(resolve(here, "..", "symbiotes.db"));

const app = createApp({
  store,
  getTickets: () => fetchMyTickets(cfg),
  getPrs: () => fetchMyOpenPrs(cfg),
});

// Serve the built frontend from the same process; API routes take precedence,
// anything else falls back to index.html.
const dist = resolve(here, "../../frontend/dist");
if (existsSync(resolve(dist, "index.html"))) {
  app.use(express.static(dist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(resolve(dist, "index.html"));
  });
  console.log(`Serving frontend from ${dist}`);
} else {
  console.log("No frontend build found — run `npm run build`. Serving API only for now.");
}

app.listen(cfg.port, "127.0.0.1", () => {
  console.log(`Symbiotes running on http://127.0.0.1:${cfg.port}`);
});
