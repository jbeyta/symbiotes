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

  it("throws when PORT is non-numeric", () => {
    expect(() => loadConfig({ ...full, PORT: "abc" })).toThrow(/PORT must be a number/);
  });
});
