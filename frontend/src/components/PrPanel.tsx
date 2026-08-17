import { useState, type ReactNode } from "react";
import type { PrView } from "../api.js";
import { FilterIcon, SpeechBubbleIcon } from "./icons.js";

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
  activeKeys = new Set<string>(),
  nav,
}: {
  prs: PrView[];
  error: string | null;
  onCreateTodo: (text: string, url?: string) => void;
  existingUrls?: Set<string>;
  /** Jira keys of tickets in progress or in review — drives the "Current work" filter. */
  activeKeys?: Set<string>;
  nav?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const q = query.trim().toLowerCase();
  // "Current work" drops PRs with no linked ticket, since they cannot match a key.
  const byWork = activeOnly ? prs.filter((p) => p.jiraKey !== null && activeKeys.has(p.jiraKey)) : prs;
  const shown = q
    ? byWork.filter((p) => `#${p.number} ${p.title} ${p.repo} ${p.jiraKey ?? ""}`.toLowerCase().includes(q))
    : byWork;

  return (
    <>
      <div className="box-tabs">
        {nav}
        <span className="box-action item-row">
          <button
            className={activeOnly ? "day-btn day-btn-on" : "day-btn"}
            aria-label="Show only PRs for current work"
            aria-pressed={activeOnly}
            title="Only PRs linked to a ticket in progress or in review"
            onClick={() => setActiveOnly(!activeOnly)}
          >
            <FilterIcon /> Current work
          </button>
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
        <div className="muted">
          {activeOnly && byWork.length === 0 ? "No PRs for current work." : "No PRs match the search."}
        </div>
      )}
      {shown.map((p) => {
        const added = existingUrls.has(p.url);
        return (
          <div className="row item-row" key={`${p.repo}#${p.number}`}>
            <span className="grow truncate" title={prLabel(p)}>
              <a href={p.url} target="_blank" rel="noreferrer">#{p.number}</a>
              {p.jiraKey ? ` - ${p.jiraKey} ${p.title}` : ` ${p.title}`}
            </span>
            {p.needsAttention && (
              <span
                className="pr-bubble nowrap"
                role="img"
                aria-label={`Unaddressed review comment on #${p.number}`}
                title="A review comment is waiting on you"
              >
                <SpeechBubbleIcon />
              </span>
            )}
            <button
              className="secondary nowrap"
              disabled={added}
              onClick={() => void onCreateTodo(prLabel(p), p.url)}
            >
              {added ? "To-Do added" : "Create To-Do"}
            </button>
          </div>
        );
      })}
    </>
  );
}
