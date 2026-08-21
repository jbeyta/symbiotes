import { describe, it, expect } from "vitest";
import { needsAttention, isApproved, type ReviewSignals } from "../src/review-flag.js";

const base: ReviewSignals = {
  viewerLogin: "me",
  lastCommitAt: "2026-08-10T12:00:00Z",
  comments: [],
  threads: [],
  reviews: [],
};

function thread(over: Partial<ReviewSignals["threads"][0]> = {}) {
  return { isResolved: false, lastCommentAuthor: "them", lastCommentAt: null, ...over };
}

describe("needsAttention", () => {
  it("is false with no comments and no threads", () => {
    expect(needsAttention(base)).toBe(false);
  });

  it("flags an unresolved thread whose last comment is theirs", () => {
    expect(
      needsAttention({ ...base, threads: [thread()] })
    ).toBe(true);
  });

  it("ignores an unresolved thread I answered last", () => {
    expect(
      needsAttention({ ...base, threads: [thread({ lastCommentAuthor: "me" })] })
    ).toBe(false);
  });

  it("ignores a resolved thread", () => {
    expect(
      needsAttention({ ...base, threads: [thread({ isResolved: true })] })
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
      needsAttention({ ...base, threads: [thread({ lastCommentAuthor: null })] })
    ).toBe(true);
  });
});

describe("isApproved", () => {
  const approval = { state: "APPROVED", submittedAt: "2026-08-11T09:00:00Z" };

  it("is false with no reviews", () => {
    expect(isApproved(base)).toBe(false);
  });

  it("is true when the approval is the newest event", () => {
    expect(isApproved({ ...base, reviews: [approval] })).toBe(true);
  });

  it("is false when a commit lands after the approval", () => {
    expect(isApproved({ ...base, lastCommitAt: "2026-08-11T10:00:00Z", reviews: [approval] })).toBe(false);
  });

  it("is false when a top-level comment lands after the approval", () => {
    expect(
      isApproved({ ...base, reviews: [approval], comments: [{ author: "them", createdAt: "2026-08-11T11:00:00Z" }] })
    ).toBe(false);
  });

  it("is false when a thread reply lands after the approval", () => {
    expect(
      isApproved({ ...base, reviews: [approval], threads: [thread({ lastCommentAt: "2026-08-11T11:00:00Z" })] })
    ).toBe(false);
  });

  it("is false when another review lands after the approval", () => {
    expect(
      isApproved({
        ...base,
        reviews: [approval, { state: "CHANGES_REQUESTED", submittedAt: "2026-08-11T12:00:00Z" }],
      })
    ).toBe(false);
  });

  it("is true when the approval follows an earlier changes-requested review", () => {
    expect(
      isApproved({
        ...base,
        reviews: [{ state: "CHANGES_REQUESTED", submittedAt: "2026-08-10T08:00:00Z" }, approval],
      })
    ).toBe(true);
  });
});
