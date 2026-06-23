import express from "express";
import type { Store } from "./store.js";
import type { JiraTicket } from "./jira.js";
import type { Pr } from "./github.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { notesRouter } from "./routes/notes.js";
import { todosRouter } from "./routes/todos.js";

export interface AppOptions {
  store: Store;
  getTickets: () => Promise<JiraTicket[]>;
  getPrs: () => Promise<Pr[]>;
}

export function createApp(opts: AppOptions): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api/dashboard", dashboardRouter({ getTickets: opts.getTickets, getPrs: opts.getPrs }));
  app.use("/api/notes", notesRouter(opts.store));
  app.use("/api/todos", todosRouter(opts.store));
  return app;
}
