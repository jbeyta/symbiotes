import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SqliteStore } from "../src/sqlite-store.js";
import type { JiraTicket } from "../src/jira.js";
import type { Pr } from "../src/github.js";

const tickets: JiraTicket[] = [
  { key: "RW-1", title: "Fix login", status: "In Progress", url: "https://x.atlassian.net/browse/RW-1" },
];
const prs: Pr[] = [
  { number: 42, title: "RW-1 add login", repo: "o/r", url: "u", branch: "" },
  { number: 43, title: "chore: bump deps", repo: "o/r", url: "u2", branch: "" },
  { number: 44, title: "RW-1 follow-up", repo: "o/r", url: "u3", branch: "" },
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
    // A ticket lists every matching open PR, not just the first.
    expect(res.body.tickets[0]).toEqual({ key: "RW-1", title: "Fix login", status: "In Progress", url: "https://x.atlassian.net/browse/RW-1", prs: [42, 44] });
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
    expect(res.body.prs).toHaveLength(3);
  });

  it("survives a failing GitHub source", async () => {
    const res = await request(
      app({ getPrs: async () => { throw new Error("boom"); } })
    ).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.prs).toEqual([]);
    expect(res.body.errors.github).toMatch(/boom/);
    expect(res.body.tickets).toHaveLength(1);
  });
});
