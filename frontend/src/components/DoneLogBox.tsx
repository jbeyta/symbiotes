import { useMemo, useState } from "react";
import { Box } from "./Box.js";
import { Modal } from "./Modal.js";
import { LinkedId } from "./TodosBox.js";
import { CommentIcon, ClockIcon } from "./icons.js";
import { updateTodo, type TodoView } from "../api.js";

// Local-timezone day key (YYYY-MM-DD) for a timestamp, so "today" matches the
// user's actual day regardless of the stored UTC value.
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayKey(): string {
  return dayKey(new Date().toISOString());
}
function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d.toISOString());
}
function labelFor(key: string): string {
  if (key === todayKey()) return "Today";
  if (key === yesterdayKey()) return "Yesterday";
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function DoneLogBox({ todos, onChange }: { todos: TodoView[]; onChange: () => void }) {
  const done = todos.filter((t) => t.done && t.completed_at);

  // Days that have completions, newest first; today is always selectable.
  const dates = useMemo(() => {
    const keys = new Set<string>(done.map((t) => dayKey(t.completed_at!)));
    keys.add(todayKey());
    return [...keys].sort().reverse();
  }, [done]);

  const [selected, setSelected] = useState<string>(todayKey());
  const [noteEditId, setNoteEditId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [moveId, setMoveId] = useState<number | null>(null);
  const day = dates.includes(selected) ? selected : todayKey();
  const items = done.filter((t) => dayKey(t.completed_at!) === day);

  async function uncheck(id: number) {
    await updateTodo(id, { done: false });
    onChange();
  }

  function toggleNote(t: TodoView) {
    if (noteEditId === t.id) { setNoteEditId(null); return; }
    setNoteDraft(t.note ?? "");
    setNoteEditId(t.id);
  }
  async function saveNote(id: number) {
    await updateTodo(id, { note: noteDraft });
    setNoteEditId(null);
    onChange();
  }

  async function moveTo(id: number, dateK: string) {
    // Noon on the target local day, so the day-key lands on that date.
    await updateTodo(id, { completed_at: `${dateK}T12:00:00` });
    setMoveId(null);
    onChange();
  }

  const picker = (
    <select value={day} onChange={(e) => setSelected(e.target.value)} aria-label="Day" style={{ width: "auto" }}>
      {dates.map((k) => <option key={k} value={k}>{labelFor(k)}</option>)}
    </select>
  );

  return (
    <Box title="Done" action={picker}>
      {items.length === 0 && <div className="muted">Nothing logged for {labelFor(day).toLowerCase()}.</div>}
      {items.map((t) => (
        <div className="row" key={t.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked
              aria-label={`Move ${t.text} back to to-do`}
              onChange={() => void uncheck(t.id)}
            />
            <span style={{ flex: 1 }}>
              {t.url ? <LinkedId text={t.text} url={t.url} /> : t.text}
            </span>
            <button
              className="icon-btn"
              aria-label={`${t.note ? "Edit" : "Add"} note for ${t.text}`}
              title={t.note ? "Edit note" : "Add note"}
              onClick={() => toggleNote(t)}
            >
              <CommentIcon />
            </button>
            <button
              className="icon-btn"
              aria-label={`Move ${t.text} to another day`}
              title="Move to another day"
              onClick={() => setMoveId(t.id)}
            >
              <ClockIcon />
            </button>
          </div>
          {noteEditId === t.id ? (
            <div className="note-editor">
              <textarea
                autoFocus
                placeholder="Add a note…"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <div className="note-actions">
                <button className="icon-btn" aria-label="Save note" title="Save" onClick={() => void saveNote(t.id)}>✓</button>
                <button className="icon-btn" aria-label="Cancel note" title="Cancel" onClick={() => setNoteEditId(null)}>×</button>
              </div>
            </div>
          ) : t.note ? (
            <div className="note-readonly">{t.note}</div>
          ) : null}
        </div>
      ))}

      {moveId !== null && (
        <Modal title="Move to day" onClose={() => setMoveId(null)}>
          {dates.filter((k) => k !== day).length === 0 && (
            <div className="muted">No other days available yet.</div>
          )}
          {dates.filter((k) => k !== day).map((k) => (
            <button
              key={k}
              className="secondary row"
              style={{ display: "block", width: "100%", textAlign: "left" }}
              onClick={() => void moveTo(moveId, k)}
            >
              {labelFor(k)}
            </button>
          ))}
        </Modal>
      )}
    </Box>
  );
}
