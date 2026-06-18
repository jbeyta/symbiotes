import { useState } from "react";
import { Box } from "./Box.js";
import { TASK_STATUSES, createTask, updateTask, deleteTask, type TaskView } from "../api.js";

export function TasksBox({ tasks, onChange }: { tasks: TaskView[]; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string>(TASK_STATUSES[0]);

  async function add() {
    if (!title.trim()) return;
    await createTask({ title: title.trim(), status });
    setTitle("");
    setStatus(TASK_STATUSES[0]);
    onChange();
  }

  async function setRowStatus(id: number, next: string) {
    await updateTask(id, { status: next });
    onChange();
  }

  async function remove(id: number) {
    await deleteTask(id);
    onChange();
  }

  return (
    <Box title="Untracked Tasks">
      <div className="row">
        <input
          placeholder="New task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => void add()}>Add</button>
        </div>
      </div>
      {tasks.length === 0 && <div className="muted">Nothing untracked right now.</div>}
      {tasks.map((t) => (
        <div className="row" key={t.id}>
          <div><strong>{t.title}</strong></div>
          {t.description && <div className="muted">{t.description}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <select value={t.status} onChange={(e) => void setRowStatus(t.id, e.target.value)}>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="secondary" aria-label={`Delete ${t.title}`} onClick={() => void remove(t.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </Box>
  );
}
