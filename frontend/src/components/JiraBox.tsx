import { useEffect, useState } from "react";
import type { JiraTicketView } from "../api.js";
import { Box } from "./Box.js";
import { Modal } from "./Modal.js";
import { JiraIcon, FilterIcon } from "./icons.js";

// Statuses shown by default. Wording varies between boards, so match loosely.
export function isDefaultVisibleStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("progress") || s.includes("review") || (s.includes("ready") && s.includes("release"));
}

export function JiraBox({
  tickets,
  error,
  onCreateTodo,
}: {
  tickets: JiraTicketView[];
  error: string | null;
  onCreateTodo: (text: string) => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  // Statuses currently shown. Defaults are applied to each status the first
  // time it appears; explicit toggles persist across refreshes this session.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [known, setKnown] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fresh = tickets.map((t) => t.status).filter((s) => !known.has(s));
    if (fresh.length === 0) return;
    setKnown((prev) => new Set([...prev, ...fresh]));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of fresh) if (isDefaultVisibleStatus(s)) next.add(s);
      return next;
    });
  }, [tickets, known]);

  const allStatuses = [...new Set(tickets.map((t) => t.status))].sort();
  const visible = tickets.filter((t) => selected.has(t.status));

  function toggleStatus(s: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const filterButton = (
    <button className="icon-btn" aria-label="Filter by status" onClick={() => setFilterOpen(true)}>
      <FilterIcon />
    </button>
  );

  return (
    <Box title="My Jira Tickets" icon={<JiraIcon />} action={filterButton}>
      {error && <div className="error row">Jira error: {error}</div>}
      {!error && tickets.length === 0 && <div className="muted">No assigned tickets.</div>}
      {!error && tickets.length > 0 && visible.length === 0 && (
        <div className="muted">No tickets match the status filter.</div>
      )}
      {visible.map((t) => (
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

      {filterOpen && (
        <Modal title="Filter by status" onClose={() => setFilterOpen(false)}>
          {allStatuses.length === 0 && <div className="muted">No statuses to filter.</div>}
          {allStatuses.map((s) => (
            <label key={s} className="row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={selected.has(s)} onChange={() => toggleStatus(s)} />
              {s}
            </label>
          ))}
          <div className="modal-actions">
            <button onClick={() => setFilterOpen(false)}>Done</button>
          </div>
        </Modal>
      )}
    </Box>
  );
}
