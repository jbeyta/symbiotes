import type { JiraTicketView } from "../api.js";
import { Box } from "./Box.js";

export function JiraBox({ tickets, error }: { tickets: JiraTicketView[]; error: string | null }) {
  return (
    <Box title="My Jira Tickets">
      {error && <div className="error row">Jira error: {error}</div>}
      {!error && tickets.length === 0 && <div className="muted">No assigned tickets.</div>}
      {tickets.map((t) => (
        <div className="row" key={t.key}>
          <strong>{t.key}</strong> {t.title}{" "}
          <span className="muted">· {t.status}</span>
          {t.pr != null && <span className="muted"> · PR #{t.pr}</span>}
        </div>
      ))}
    </Box>
  );
}
