import { describe, it, expect } from "vitest";
import { needsAttention, type ReviewSignals } from "../src/review-flag.js";

const base: ReviewSignals = {
  viewerLogin: "me",
  lastCommitAt: "2026-08-10T12:00:00Z",
  comments: [],
  threads: [],
};

describe("needsAttention", () => {
  it("is false with no comments and no threads", () => {
    expect(needsAttention(base)).toBe(false);
  });

  it("flags an unresolved thread whose last comment is theirs", () => {
    expect(
      needsAttention({ ...base, threads: [{ isResolved: false, lastCommentAuthor: "them" }] })
    ).toBe(true);
  });

  it("ignores an unresolved thread I answered last", () => {
    expect(
      needsAttention({ ...base, threads: [{ isResolved: false, lastCommentAuthor: "me" }] })
    ).toBe(false);
  });

  it("ignores a resolved thread", () => {
    expect(
      needsAttention({ ...base, threads: [{ isResolved: true, lastCommentAuthor: "them" }] })
    ).toBe(false);
  });

  it("flags their comment newer than my last comment and the last commit", () => {
    expect(
      needsAttention({
        ...base,
        comments: [
          { author: "me", createdAt: "2026-08-10T09:00:00Z" },
          { author: "them", createdAt: "2026-08-10T15:00:00Z" },
        ],
      })
    ).toBe(true);
  });

  it("ignores their comment older than the last commit", () => {
    expect(
      needsAttention({
        ...base,
        comments: [{ author: "them", createdAt: "2026-08-10T08:00:00Z" }],
      })
    ).toBe(false);
  });

  it("ignores their comment older than my reply, even after the last commit", () => {
    expect(
      needsAttention({
        ...base,
        comments: [
          { author: "them", createdAt: "2026-08-10T13:00:00Z" },
          { author: "me", createdAt: "2026-08-10T14:00:00Z" },
        ],
      })
    ).toBe(false);
  });

  it("flags their comment when the PR has no commits yet", () => {
    expect(
      needsAttention({
        ...base,
        lastCommitAt: null,
        comments: [{ author: "them", createdAt: "2026-08-10T08:00:00Z" }],
      })
    ).toBe(true);
  });

  it("treats a deleted-account author as not me", () => {
    expect(
      needsAttention({ ...base, threads: [{ isResolved: false, lastCommentAuthor: null }] })
    ).toBe(true);
  });
});
