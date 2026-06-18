import type { PrView } from "../api.js";
import { Box } from "./Box.js";

export function PrBox({ prs, error }: { prs: PrView[]; error: string | null }) {
  return (
    <Box title="My Open PRs">
      {error && <div className="error row">GitHub error: {error}</div>}
      {!error && prs.length === 0 && <div className="muted">No open PRs.</div>}
      {prs.map((p) => (
        <div className="row" key={`${p.repo}#${p.number}`}>
          <a href={p.url} target="_blank" rel="noreferrer">#{p.number}</a> {p.title}{" "}
          {p.jiraKey ? <span className="muted">· {p.jiraKey}</span> : <span className="muted">· no ticket</span>}
        </div>
      ))}
    </Box>
  );
}
