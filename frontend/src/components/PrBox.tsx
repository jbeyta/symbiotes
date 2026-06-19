import type { PrView } from "../api.js";
import { Box } from "./Box.js";
import { GitHubIcon } from "./icons.js";

export function PrBox({
  prs,
  error,
  onCreateTodo,
}: {
  prs: PrView[];
  error: string | null;
  onCreateTodo: (text: string) => void;
}) {
  return (
    <Box title="My Open PRs" icon={<GitHubIcon />}>
      {error && <div className="error row">GitHub error: {error}</div>}
      {!error && prs.length === 0 && <div className="muted">No open PRs.</div>}
      {prs.map((p) => (
        <div className="row" key={`${p.repo}#${p.number}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1 }}>
            <a href={p.url} target="_blank" rel="noreferrer">#{p.number}</a> {p.title}{" "}
            {p.jiraKey ? <span className="muted">· {p.jiraKey}</span> : <span className="muted">· no ticket</span>}
          </span>
          <button
            className="secondary"
            style={{ flex: "none", whiteSpace: "nowrap" }}
            onClick={() => onCreateTodo(`#${p.number} ${p.title}`)}
          >
            Create To-Do
          </button>
        </div>
      ))}
    </Box>
  );
}
