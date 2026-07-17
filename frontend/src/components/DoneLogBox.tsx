import { useState } from "react";
import { Box } from "./Box.js";
import { Modal } from "./Modal.js";
import { Calendar } from "./Calendar.js";
import { LinkedId } from "./TodosBox.js";
import { CommentIcon, ClockIcon, CalendarIcon, FlagIcon, QuestionIcon } from "./icons.js";
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

// Row highlight for a done item. Post-release (magenta) takes precedence over
// a standup question (yellow) when an item carries both flags.
function rowClass(t: TodoView): string {
  if (t.post_release) return "item-row post-release";
  if (t.question) return "item-row question";
  return "item-row";
}

export function DoneLogBox({ todos, onChange }: { todos: TodoView[]; onChange: () => void }) {
  const done = todos.filter((t) => t.done && t.completed_at);

  const [selected, setSelected] = useState<string>(todayKey());
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  // Active flag filter, or null for the normal per-day view.
  const [filter, setFilter] = useState<"post_release" | "question" | null>(null);
  const [noteEditId, setNoteEditId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [moveId, setMoveId] = useState<number | null>(null);
  const day = selected;
  // A flag filter ignores the day and lists every matching item, newest first;
  // the normal view is scoped to the picked day.
  const items = filter
    ? done.filter((t) => t[filter]).sort((a, b) => b.completed_at!.localeCompare(a.completed_at!))
    : done.filter((t) => dayKey(t.completed_at!) === day);

  async function uncheck(id: number) {
    await updateTodo(id, { done: false });
    onChange();
  }

  async function togglePostRelease(t: TodoView) {
    await updateTodo(t.id, { post_release: !t.post_release });
    onChange();
  }

  async function toggleQuestion(t: TodoView) {
    await updateTodo(t.id, { question: !t.question });
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

  const toggleFilter = (f: "post_release" | "question") => setFilter((prev) => (prev === f ? null : f));

  // Glow the filter buttons while any done item still carries that flag.
  const hasFlagged = done.some((t) => t.post_release);
  const hasQuestions = done.some((t) => t.question);

  const actions = (
    <span className="item-row">
      <button
        className={`icon-btn${filter === "post_release" ? " flag-on" : ""}${hasFlagged ? " glow-pink" : ""}`}
        aria-label={filter === "post_release" ? "Show all done items" : "Show only flagged items"}
        aria-pressed={filter === "post_release"}
        title={filter === "post_release" ? "Showing flagged only" : "Show flagged only"}
        onClick={() => toggleFilter("post_release")}
      >
        <FlagIcon />
      </button>
      <button
        className={`icon-btn${filter === "question" ? " question-on" : ""}${hasQuestions ? " glow-yellow" : ""}`}
        aria-label={filter === "question" ? "Show all done items" : "Show only question items"}
        aria-pressed={filter === "question"}
        title={filter === "question" ? "Showing questions only" : "Show questions only"}
        onClick={() => toggleFilter("question")}
      >
        <QuestionIcon />
      </button>
      {!filter && (
        <button className="day-btn" aria-label="Pick day" onClick={() => setDayPickerOpen(true)}>
          <CalendarIcon /> {labelFor(day)}
        </button>
      )}
    </span>
  );

  const emptyMsg =
    filter === "post_release" ? "No flagged items."
    : filter === "question" ? "No question items."
    : `Nothing logged for ${labelFor(day).toLowerCase()}.`;

  return (
    <Box title="Done" action={actions}>
      {items.length === 0 && <div className="muted">{emptyMsg}</div>}
      {items.map((t) => (
        <div className="row" key={t.id}>
          <div className={rowClass(t)}>
            <input
              type="checkbox"
              checked
              aria-label={`Move ${t.text} back to to-do`}
              onChange={() => void uncheck(t.id)}
            />
            {filter && <span className="muted nowrap">{labelFor(dayKey(t.completed_at!))}</span>}
            <span className="grow truncate" title={t.text}>
              {t.url ? <LinkedId text={t.text} url={t.url} /> : t.text}
            </span>
            <button
              className={t.post_release ? "icon-btn flag-on" : "icon-btn"}
              aria-label={`${t.post_release ? "Clear" : "Flag"} post-release action for ${t.text}`}
              aria-pressed={t.post_release}
              title={t.post_release ? "Clear post-release flag" : "Flag: post-release action required"}
              onClick={() => void togglePostRelease(t)}
            >
              <FlagIcon />
            </button>
            <button
              className={t.question ? "icon-btn question-on" : "icon-btn"}
              aria-label={`${t.question ? "Clear" : "Flag"} standup question for ${t.text}`}
              aria-pressed={t.question}
              title={t.question ? "Clear question flag" : "Flag: question for standup"}
              onClick={() => void toggleQuestion(t)}
            >
              <QuestionIcon />
            </button>
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

      {dayPickerOpen && (
        <Modal title="Pick a day" onClose={() => setDayPickerOpen(false)}>
          <Calendar
            initial={day}
            max={todayKey()}
            onPick={(k) => { setSelected(k); setDayPickerOpen(false); }}
          />
        </Modal>
      )}

      {moveId !== null && (
        <Modal title="Move to day" onClose={() => setMoveId(null)}>
          <Calendar initial={day} max={todayKey()} onPick={(k) => void moveTo(moveId, k)} />
        </Modal>
      )}
    </Box>
  );
}
