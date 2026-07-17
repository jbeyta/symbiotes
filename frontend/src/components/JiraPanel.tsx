import { useEffect, useState, type ReactNode } from "react";
import type { JiraTicketView } from "../api.js";
import { Modal } from "./Modal.js";
import { FilterIcon } from "./icons.js";

// Statuses shown by default. Wording varies between boards, so match loosely.
export function isDefaultVisibleStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("progress") || s.includes("review") || (s.includes("ready") && s.includes("release"));
}

const LS_SELECTED = "symbiotes.jira.filter.selected";
const LS_KNOWN = "symbiotes.jira.filter.known";

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* storage unavailable — filter just won't persist */
  }
}

export function JiraPanel({
  tickets,
  error,
  onCreateTodo,
  existingUrls = new Set<string>(),
  nav,
}: {
  tickets: JiraTicketView[];
  error: string | null;
  onCreateTodo: (text: string, url?: string) => void;
  existingUrls?: Set<string>;
  nav?: ReactNode;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Statuses currently shown, persisted in localStorage so the filter survives
  // full reloads. `known` tracks statuses already seen, so defaults are applied
  // only the first time a status appears — a status you unchecked stays unchecked.
  const [selected, setSelected] = useState<Set<string>>(() => loadSet(LS_SELECTED));
  const [known, setKnown] = useState<Set<string>>(() => loadSet(LS_KNOWN));

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

  useEffect(() => { saveSet(LS_SELECTED, selected); }, [selected]);
  useEffect(() => { saveSet(LS_KNOWN, known); }, [known]);

  const allStatuses = [...new Set(tickets.map((t) => t.status))].sort();
  const visible = tickets.filter((t) => selected.has(t.status));
  const q = query.trim().toLowerCase();
  const shown = q
    ? visible.filter((t) => `${t.key} ${t.title} ${t.status}`.toLowerCase().includes(q))
    : visible;

  function toggleStatus(s: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  return (
    <>
      <div className="box-tabs">
        {nav}
        <span className="box-action item-row">
          <input
            className="search"
            type="search"
            placeholder="Search…"
            aria-label="Search tickets"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="icon-btn" aria-label="Filter by status" onClick={() => setFilterOpen(true)}>
            <FilterIcon />
          </button>
        </span>
      </div>

      {error && <div className="error row">Jira error: {error}</div>}
      {!error && tickets.length === 0 && <div className="muted">No assigned tickets.</div>}
      {!error && visible.length === 0 && tickets.length > 0 && (
        <div className="muted">No tickets match the status filter.</div>
      )}
      {!error && visible.length > 0 && shown.length === 0 && (
        <div className="muted">No tickets match the search.</div>
      )}
      {shown.map((t) => {
        const todoText = `${t.key} ${t.title}`;
        const added = existingUrls.has(t.url);
        const prs = t.prs.length > 0 ? ` · PR ${t.prs.map((n) => `#${n}`).join(", ")}` : "";
        return (
          <div className="row item-row" key={t.key}>
            <span className="grow truncate" title={`${t.key} ${t.title} · ${t.status}${prs}`}>
              <a href={t.url} target="_blank" rel="noreferrer"><strong>{t.key}</strong></a> {t.title}{" "}
              <span className="muted">· {t.status}</span>
              {t.prs.length > 0 && <span className="muted">{prs}</span>}
            </span>
            <button
              className="secondary nowrap"
              disabled={added}
              onClick={() => onCreateTodo(todoText, t.url)}
            >
              {added ? "To-Do added" : "Create To-Do"}
            </button>
          </div>
        );
      })}

      {filterOpen && (
        <Modal title="Filter by status" onClose={() => setFilterOpen(false)}>
          {allStatuses.length === 0 && <div className="muted">No statuses to filter.</div>}
          {allStatuses.map((s) => (
            <label key={s} className="row item-row">
              <input type="checkbox" checked={selected.has(s)} onChange={() => toggleStatus(s)} />
              {s}
            </label>
          ))}
          <div className="modal-actions">
            <button onClick={() => setFilterOpen(false)}>Done</button>
          </div>
        </Modal>
      )}
    </>
  );
}
