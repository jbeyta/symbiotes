import type { JiraTicketView } from "../api.js";
import { Box } from "./Box.js";
import { JiraIcon } from "./icons.js";

export function JiraBox({
  tickets,
  error,
  onCreateTodo,
}: {
  tickets: JiraTicketView[];
  error: string | null;
  onCreateTodo: (text: string) => void;
}) {
  return (
    <Box title="My Jira Tickets" icon={<JiraIcon />}>
      {error && <div className="error row">Jira error: {error}</div>}
      {!error && tickets.length === 0 && <div className="muted">No assigned tickets.</div>}
      {tickets.map((t) => (
        <div className="row" key={t.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1 }}>
            <a href={t.url} target="_blank" rel="noreferrer"><strong>{t.key}</strong></a> {t.title}{" "}
            <span className="muted">· {t.status}</span>
            {t.pr != null && <span className="muted"> · PR #{t.pr}</span>}
          </span>
          <button
            className="secondary"
            style={{ flex: "none", whiteSpace: "nowrap" }}
            onClick={() => onCreateTodo(`${t.key} ${t.title}`)}
          >
            Create To-Do
          </button>
        </div>
      ))}
    </Box>
  );
}
