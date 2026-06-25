import { Router } from "express";
import type { JiraTicket } from "../jira.js";
import type { Pr } from "../github.js";
import { extractJiraKey } from "../links.js";

export interface DashTicket extends JiraTicket { prs: number[]; }
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
    prs: dashPrs.filter((p) => p.jiraKey === t.key).map((p) => p.number),
  }));

  return { tickets: dashTickets, prs: dashPrs, errors };
}

export function dashboardRouter(deps: DashboardDeps): Router {
  const router = Router();
  router.get("/", async (_req, res) => {
    try {
      res.json(await buildDashboard(deps));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ tickets: [], prs: [], errors: { jira: msg, github: msg } });
    }
  });
  return router;
}
