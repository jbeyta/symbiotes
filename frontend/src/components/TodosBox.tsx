import { useEffect, useRef, useState } from "react";
import { Box } from "./Box.js";
import { Modal } from "./Modal.js";
import { CommentIcon } from "./icons.js";
import { createTodo, updateTodo, deleteTodo, reorderTodos, type TodoView } from "../api.js";

// Link only the leading identifier (e.g. "RW-1" or "#42"), like the Jira/PR boxes.
export function LinkedId({ text, url }: { text: string; url: string }) {
  const i = text.indexOf(" ");
  const id = i === -1 ? text : text.slice(0, i);
  const rest = i === -1 ? "" : text.slice(i);
  return (
    <>
      <a href={url} target="_blank" rel="noreferrer">{id}</a>
      {rest}
    </>
  );
}

// Pure helper: return a copy of `arr` with the item at `from` moved to `to`.
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function TodosBox({ todos, onChange }: { todos: TodoView[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  // Local working order for drag feedback; kept in sync with the server list.
  const [order, setOrder] = useState<TodoView[]>(todos);
  const orderRef = useRef(order);
  const dragFrom = useRef<number | null>(null);
  const [noteEditId, setNoteEditId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => { setOrder(todos); }, [todos]);
  useEffect(() => { orderRef.current = order; }, [order]);

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

  function close() {
    setOpen(false);
    setText("");
  }

  async function add() {
    if (!text.trim()) return;
    await createTodo({ text: text.trim() });
    close();
    onChange();
  }

  async function toggle(id: number, done: boolean) {
    await updateTodo(id, { done });
    onChange();
  }

  async function remove(id: number) {
    await deleteTodo(id);
    onChange();
  }

  function onDragEnter(i: number) {
    const from = dragFrom.current;
    if (from === null || from === i) return;
    setOrder((prev) => moveItem(prev, from, i));
    dragFrom.current = i;
  }

  async function persistOrder() {
    dragFrom.current = null;
    await reorderTodos(orderRef.current.map((t) => t.id));
    onChange();
  }

  return (
    <Box title="To-Do Today" action={<button onClick={() => setOpen(true)}>Add</button>}>
      {open && (
        <Modal title="New To-Do" onClose={close}>
          <input
            autoFocus
            placeholder="Add a to-do"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
          />
          <div className="modal-actions">
            <button className="secondary" onClick={close}>Cancel</button>
            <button onClick={() => void add()}>Add To-Do</button>
          </div>
        </Modal>
      )}
      {order.length === 0 && <div className="muted">Nothing to do — add something.</div>}
      {order.map((t, i) => (
        <div className="row" key={t.id}>
          <div
            className="todo-line"
            draggable
            onDragStart={() => { dragFrom.current = i; }}
            onDragEnter={() => onDragEnter(i)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={() => void persistOrder()}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span className="grip" aria-hidden="true" title="Drag to reorder">⠿</span>
            <input
              type="checkbox"
              checked={t.done}
              aria-label={`Mark ${t.text} ${t.done ? "not done" : "done"}`}
              onChange={() => void toggle(t.id, !t.done)}
            />
            <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--muted)" : "inherit" }}>
              {t.url ? <LinkedId text={t.text} url={t.url} /> : t.text}
            </span>
            <button
              className={`icon-btn${t.note ? " has-note" : ""}`}
              aria-label={`${t.note ? "Edit" : "Add"} note for ${t.text}`}
              title={t.note ? "Edit note" : "Add note"}
              onClick={() => toggleNote(t)}
            >
              <CommentIcon />
            </button>
            <button className="secondary" aria-label={`Remove ${t.text}`} onClick={() => void remove(t.id)}>
              ×
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
    </Box>
  );
}
