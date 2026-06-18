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
