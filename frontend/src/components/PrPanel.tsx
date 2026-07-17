import { useState, type ReactNode } from "react";
import type { PrView } from "../api.js";

// Display / to-do text for a PR: "#<num> - <KEY> <title>", or "#<num> <title>"
// when the PR has no linked Jira ticket.
function prLabel(p: PrView): string {
  return p.jiraKey ? `#${p.number} - ${p.jiraKey} ${p.title}` : `#${p.number} ${p.title}`;
}

export function PrPanel({
  prs,
  error,
  onCreateTodo,
  existingUrls = new Set<string>(),
  nav,
}: {
  prs: PrView[];
  error: string | null;
  onCreateTodo: (text: string, url?: string) => void;
  existingUrls?: Set<string>;
  nav?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? prs.filter((p) => `#${p.number} ${p.title} ${p.repo} ${p.jiraKey ?? ""}`.toLowerCase().includes(q))
    : prs;

  return (
    <>
      <div className="box-tabs">
        {nav}
        <span className="box-action item-row">
          <input
            className="search"
            type="search"
            placeholder="Search…"
            aria-label="Search PRs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>
      </div>

      {error && <div className="error row">GitHub error: {error}</div>}
      {!error && prs.length === 0 && <div className="muted">No open PRs.</div>}
      {!error && prs.length > 0 && shown.length === 0 && (
        <div className="muted">No PRs match the search.</div>
      )}
      {shown.map((p) => {
        const added = existingUrls.has(p.url);
        return (
          <div className="row item-row" key={`${p.repo}#${p.number}`}>
            <span className="grow truncate" title={prLabel(p)}>
              <a href={p.url} target="_blank" rel="noreferrer">#{p.number}</a>
              {p.jiraKey ? ` - ${p.jiraKey} ${p.title}` : ` ${p.title}`}
            </span>
            <button
              className="secondary nowrap"
              disabled={added}
              onClick={() => onCreateTodo(prLabel(p), p.url)}
            >
              {added ? "To-Do added" : "Create To-Do"}
            </button>
          </div>
        );
      })}
    </>
  );
}
