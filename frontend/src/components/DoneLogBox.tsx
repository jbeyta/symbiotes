import { useState } from "react";
import { Box } from "./Box.js";
import { Modal } from "./Modal.js";
import { Calendar } from "./Calendar.js";
import { LinkedId } from "./TodosBox.js";
import { CommentIcon, ClockIcon, CalendarIcon, FlagIcon, QuestionIcon } from "./icons.js";
import { dayKey, todayKey, labelFor, rowClass } from "./todo-helpers.js";
import { updateTodo, type TodoView } from "../api.js";

// Re-export so existing importers (and tests) can keep pulling dayKey from here.
export { dayKey };

export function DoneLogBox({ todos, onChange }: { todos: TodoView[]; onChange: () => void }) {
  const done = todos.filter((t) => t.done && t.completed_at);

  const [selected, setSelected] = useState<string>(todayKey());
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [noteEditId, setNoteEditId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [moveId, setMoveId] = useState<number | null>(null);
  const day = selected;
  const items = done.filter((t) => dayKey(t.completed_at!) === day);
  // Days that actually have logged items — the day filter disables the rest.
  const daysWithItems = new Set(done.map((t) => dayKey(t.completed_at!)));

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

  const actions = (
    <span className="item-row">
      <button className="day-btn" aria-label="Pick day" onClick={() => setDayPickerOpen(true)}>
        <CalendarIcon /> {labelFor(day)}
      </button>
    </span>
  );

  return (
    <Box title="Done" action={actions}>
      {items.length === 0 && <div className="muted">{`Nothing logged for ${labelFor(day).toLowerCase()}.`}</div>}
      {items.map((t) => (
        <div className="row" key={t.id}>
          <div className={rowClass(t)}>
            <input
              type="checkbox"
              checked
              aria-label={`Move ${t.text} back to to-do`}
              onChange={() => void uncheck(t.id)}
            />
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
            enabledDays={daysWithItems}
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
