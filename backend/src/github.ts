import type { Config } from "./config.js";
import { needsAttention } from "./review-flag.js";

export interface Pr {
  number: number;
  title: string;
  repo: string;
  url: string;
  branch: string;
  /** A review comment is waiting on me — see review-flag.ts for the rule. */
  needsAttention: boolean;
}

// One GraphQL request covers every open PR: branch name (so Jira-key linking can
// read the branch, not just the title), the newest commit date, top-level
// comments, and inline review threads with GitHub's own resolved state.
const QUERY = `
query {
  viewer { login }
  search(query: "is:pr is:open author:@me", type: ISSUE, first: 100) {
    nodes {
      ... on PullRequest {
        number
        title
        url
        headRefName
        repository { nameWithOwner }
        commits(last: 1) { nodes { commit { committedDate } } }
        comments(last: 50) { nodes { createdAt author { login } } }
        reviewThreads(first: 50) {
          nodes { isResolved comments(last: 1) { nodes { author { login } } } }
        }
      }
    }
  }
}`;

interface GqlAuthor { login: string }
interface GqlPr {
  number: number;
  title: string;
  url: string;
  headRefName: string;
  repository: { nameWithOwner: string };
  commits: { nodes: { commit: { committedDate: string } }[] };
  comments: { nodes: { createdAt: string; author: GqlAuthor | null }[] };
  reviewThreads: { nodes: { isResolved: boolean; comments: { nodes: { author: GqlAuthor | null }[] } }[] };
}
interface GqlBody {
  data?: { viewer: { login: string }; search: { nodes: (GqlPr | Record<string, never>)[] } };
  errors?: { message: string }[];
}

export async function fetchMyOpenPrs(
  cfg: Config,
  fetchImpl: typeof fetch = fetch
): Promise<Pr[]> {
  const res = await fetchImpl("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.githubToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "symbiotes",
    },
    body: JSON.stringify({ query: QUERY }),
  });
  if (!res.ok) throw new Error(`GitHub request failed: ${res.status}`);
  const body = (await res.json()) as GqlBody;
  if (body.errors?.length) {
    throw new Error(`GitHub request failed: ${body.errors.map((e) => e.message).join("; ")}`);
  }
  if (!body.data) throw new Error("GitHub request failed: empty response");

  const viewerLogin = body.data.viewer.login;
  // The search returns Issues too; only PullRequest nodes carry `number`.
  const nodes = body.data.search.nodes.filter((n): n is GqlPr => "number" in n);

  return nodes.map((p) => ({
    number: p.number,
    title: p.title,
    repo: p.repository.nameWithOwner,
    url: p.url,
    branch: p.headRefName,
    needsAttention: needsAttention({
      viewerLogin,
      lastCommitAt: p.commits.nodes[0]?.commit.committedDate ?? null,
      comments: p.comments.nodes.map((c) => ({
        author: c.author?.login ?? null,
        createdAt: c.createdAt,
      })),
      threads: p.reviewThreads.nodes.map((t) => ({
        isResolved: t.isResolved,
        lastCommentAuthor: t.comments.nodes[0]?.author?.login ?? null,
      })),
    }),
  }));
}
