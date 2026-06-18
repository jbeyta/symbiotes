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
