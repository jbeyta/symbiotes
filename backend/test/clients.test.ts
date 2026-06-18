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
          },
        ],
      })
    );
    const prs = await fetchMyOpenPrs(cfg, stub as unknown as typeof fetch);
    expect(prs[0]).toEqual({
      number: 42,
      title: "RW-1 add login",
      repo: "o/r",
      url: "https://github.com/o/r/pull/42",
      branch: "",
    });
  });

  it("throws on a non-OK response", async () => {
    const stub = vi.fn(async () => jsonResponse({}, false));
    await expect(fetchMyOpenPrs(cfg, stub as unknown as typeof fetch)).rejects.toThrow(/GitHub/);
  });
});
