import { useState } from "react";
import { Box } from "./Box.js";
import { createTodo, updateTodo, deleteTodo, type TodoView } from "../api.js";

export function TodosBox({ todos, onChange }: { todos: TodoView[]; onChange: () => void }) {
  const [text, setText] = useState("");

  async function add() {
    if (!text.trim()) return;
    await createTodo({ text: text.trim() });
    setText("");
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
    <Box title="To-Do Today">
      <div className="row" style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Add a to-do"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
        />
        <button onClick={() => void add()}>Add</button>
      </div>
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
            {t.text}
          </span>
          <button className="secondary" aria-label={`Remove ${t.text}`} onClick={() => void remove(t.id)}>
            ×
          </button>
        </div>
      ))}
    </Box>
  );
}
