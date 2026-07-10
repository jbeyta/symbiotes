import { useState } from "react";
import type { PrView } from "../api.js";
import { Box } from "./Box.js";
import { GitHubIcon } from "./icons.js";

export function PrBox({
  prs,
  error,
  onCreateTodo,
  existingUrls = new Set<string>(),
}: {
  prs: PrView[];
  error: string | null;
  onCreateTodo: (text: string, url?: string) => void;
  existingUrls?: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? prs.filter((p) => `#${p.number} ${p.title} ${p.repo} ${p.jiraKey ?? ""}`.toLowerCase().includes(q))
    : prs;

  const search = (
    <input
      className="search"
      type="search"
      placeholder="Search…"
      aria-label="Search PRs"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );

  return (
    <Box title="My Open PRs" icon={<GitHubIcon />} action={search}>
      {error && <div className="error row">GitHub error: {error}</div>}
      {!error && prs.length === 0 && <div className="muted">No open PRs.</div>}
      {!error && prs.length > 0 && shown.length === 0 && (
        <div className="muted">No PRs match the search.</div>
      )}
      {shown.map((p) => {
        const todoText = `#${p.number} ${p.title}`;
        const added = existingUrls.has(p.url);
        return (
          <div className="row item-row" key={`${p.repo}#${p.number}`}>
            <span className="grow">
              <a href={p.url} target="_blank" rel="noreferrer">#{p.number}</a> {p.title}{" "}
              {p.jiraKey ? <span className="muted">· {p.jiraKey}</span> : <span className="muted">· no ticket</span>}
            </span>
            <button
              className="secondary nowrap"
              disabled={added}
              onClick={() => onCreateTodo(todoText, p.url)}
            >
              {added ? "To-Do added" : "Create To-Do"}
            </button>
          </div>
        );
      })}
    </Box>
  );
}
