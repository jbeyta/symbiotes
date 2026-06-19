import { useState } from "react";
import { Box } from "./Box.js";
import { Modal } from "./Modal.js";
import { createTodo, updateTodo, deleteTodo, type TodoView } from "../api.js";

// Link only the leading identifier (e.g. "RW-1" or "#42"), like the Jira/PR boxes.
function LinkedId({ text, url }: { text: string; url: string }) {
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

export function TodosBox({ todos, onChange }: { todos: TodoView[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

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
      {todos.length === 0 && <div className="muted">Nothing to do — add something.</div>}
      {todos.map((t) => (
        <div className="row" key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={t.done}
            aria-label={`Mark ${t.text} ${t.done ? "not done" : "done"}`}
            onChange={() => void toggle(t.id, !t.done)}
          />
          <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--muted)" : "inherit" }}>
            {t.url ? <LinkedId text={t.text} url={t.url} /> : t.text}
          </span>
          <button className="secondary" aria-label={`Remove ${t.text}`} onClick={() => void remove(t.id)}>
            ×
          </button>
        </div>
      ))}
    </Box>
  );
}
