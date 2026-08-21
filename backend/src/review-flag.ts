// "Someone is waiting on me" rule for an open PR.
//
// Timestamps alone are not enough: a reviewer can leave a comment while a push
// is in flight, so the comment lands *before* the newest commit and still needs
// an answer. So the rule has two independent halves and either one flags the PR.

export interface ReviewComment {
  author: string | null;
  createdAt: string;
}

export interface ReviewThread {
  isResolved: boolean;
  lastCommentAuthor: string | null;
  lastCommentAt: string | null;
}

export interface PrReview {
  state: string;
  submittedAt: string | null;
}

export interface ReviewSignals {
  viewerLogin: string;
  /** Committed date of the PR's most recent commit, whoever wrote it. */
  lastCommitAt: string | null;
  /** Top-level (conversation) comments on the PR. */
  comments: ReviewComment[];
  /** Inline review threads. */
  threads: ReviewThread[];
  /** Submitted reviews (approvals, change requests, review comments). */
  reviews: PrReview[];
}

function time(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return isNaN(t) ? null : t;
}

/**
 * True when either:
 *  - an inline review thread is unresolved and its last comment is not mine
 *    (GitHub's own resolved state, so out-of-order timestamps cannot fool it), or
 *  - someone else's top-level comment is newer than both my last top-level
 *    comment and the most recent commit.
 */
export function needsAttention(s: ReviewSignals): boolean {
  const openThread = s.threads.some(
    (t) => !t.isResolved && t.lastCommentAuthor !== s.viewerLogin
  );
  if (openThread) return true;

  const mine = s.comments
    .filter((c) => c.author === s.viewerLogin)
    .map((c) => time(c.createdAt))
    .filter((t): t is number => t !== null);
  const myLast = mine.length > 0 ? Math.max(...mine) : null;
  const commit = time(s.lastCommitAt);
  const cutoffs = [myLast, commit].filter((t): t is number => t !== null);
  const cutoff = cutoffs.length > 0 ? Math.max(...cutoffs) : null;

  return s.comments.some((c) => {
    if (c.author === s.viewerLogin) return false;
    const at = time(c.createdAt);
    if (at === null) return false;
    return cutoff === null || at > cutoff;
  });
}

/**
 * True when the PR has an approval and no event after it — no commit, top-level
 * comment, thread reply, or other review. A stale approval does not count.
 */
export function isApproved(s: ReviewSignals): boolean {
  const approvals = s.reviews
    .filter((r) => r.state === "APPROVED")
    .map((r) => time(r.submittedAt))
    .filter((t): t is number => t !== null);
  if (approvals.length === 0) return false;
  const lastApproval = Math.max(...approvals);

  const later = [
    time(s.lastCommitAt),
    ...s.comments.map((c) => time(c.createdAt)),
    ...s.threads.map((t) => time(t.lastCommentAt)),
    ...s.reviews.filter((r) => r.state !== "APPROVED").map((r) => time(r.submittedAt)),
  ].filter((t): t is number => t !== null);
  return later.every((t) => t <= lastApproval);
}
