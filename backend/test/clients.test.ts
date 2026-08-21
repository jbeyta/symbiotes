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
  it("maps Jira issues to tickets and calls the new endpoint", async () => {
    const stub = vi.fn(async () =>
      jsonResponse({
        issues: [
          { key: "RW-1", fields: { summary: "Fix login", status: { name: "In Progress" } } },
        ],
      })
    );
    const tickets = await fetchMyTickets(cfg, stub as unknown as typeof fetch);
    expect(tickets).toEqual([
      { key: "RW-1", title: "Fix login", status: "In Progress", url: "https://x.atlassian.net/browse/RW-1" },
    ]);
    const [calledUrl, calledOptions] = stub.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toMatch(/\/rest\/api\/3\/search\/jql$/);
    expect(calledOptions.method).toBe("POST");
  });

  it("throws on a non-OK response", async () => {
    const stub = vi.fn(async () => jsonResponse({}, false));
    await expect(fetchMyTickets(cfg, stub as unknown as typeof fetch)).rejects.toThrow(/Jira/);
  });
});

function gqlPr(over: Record<string, unknown> = {}) {
  return {
    number: 42,
    title: "add login",
    url: "https://github.com/o/r/pull/42",
    headRefName: "feature/RW-1-login",
    repository: { nameWithOwner: "o/r" },
    commits: { nodes: [{ commit: { committedDate: "2026-08-10T12:00:00Z" } }] },
    comments: { nodes: [] },
    reviews: { nodes: [] },
    reviewThreads: { nodes: [] },
    ...over,
  };
}

function gqlResponse(prs: Record<string, unknown>[]) {
  return jsonResponse({ data: { viewer: { login: "me" }, search: { nodes: prs } } });
}

describe("fetchMyOpenPrs", () => {
  it("maps GraphQL pull requests to PRs, including the branch", async () => {
    const stub = vi.fn(async () => gqlResponse([gqlPr()]));
    const prs = await fetchMyOpenPrs(cfg, stub as unknown as typeof fetch);
    expect(prs[0]).toEqual({
      number: 42,
      title: "add login",
      repo: "o/r",
      url: "https://github.com/o/r/pull/42",
      branch: "feature/RW-1-login",
      needsAttention: false,
      approved: false,
    });
    const [calledUrl] = stub.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe("https://api.github.com/graphql");
  });

  it("sets needsAttention from the review signals", async () => {
    const stub = vi.fn(async () =>
      gqlResponse([
        gqlPr({
          reviewThreads: {
            nodes: [{ isResolved: false, comments: { nodes: [{ author: { login: "them" } }] } }],
          },
        }),
      ])
    );
    const prs = await fetchMyOpenPrs(cfg, stub as unknown as typeof fetch);
    expect(prs[0].needsAttention).toBe(true);
  });

  it("marks a PR approved and drops needsAttention when the approval is last", async () => {
    const stub = vi.fn(async () =>
      gqlResponse([
        gqlPr({
          reviews: { nodes: [{ state: "APPROVED", submittedAt: "2026-08-11T09:00:00Z" }] },
          reviewThreads: {
            nodes: [{ isResolved: false, comments: { nodes: [{ createdAt: "2026-08-10T15:00:00Z", author: { login: "them" } }] } }],
          },
        }),
      ])
    );
    const prs = await fetchMyOpenPrs(cfg, stub as unknown as typeof fetch);
    expect(prs[0].approved).toBe(true);
    expect(prs[0].needsAttention).toBe(false);
  });

  it("skips non-PullRequest search nodes", async () => {
    const stub = vi.fn(async () => gqlResponse([{}, gqlPr()]));
    const prs = await fetchMyOpenPrs(cfg, stub as unknown as typeof fetch);
    expect(prs).toHaveLength(1);
  });

  it("throws on a non-OK response", async () => {
    const stub = vi.fn(async () => jsonResponse({}, false));
    await expect(fetchMyOpenPrs(cfg, stub as unknown as typeof fetch)).rejects.toThrow(/GitHub/);
  });

  it("throws on a GraphQL error payload", async () => {
    const stub = vi.fn(async () => jsonResponse({ errors: [{ message: "Bad credentials" }] }));
    await expect(fetchMyOpenPrs(cfg, stub as unknown as typeof fetch)).rejects.toThrow(/Bad credentials/);
  });
});
