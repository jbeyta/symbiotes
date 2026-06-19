import { useState } from "react";
import { Box } from "./Box.js";
import { Modal } from "./Modal.js";
import { TASK_STATUSES, createTask, updateTask, deleteTask, type TaskView } from "../api.js";

export function TasksBox({
  tasks,
  onChange,
  onCreateTodo,
}: {
  tasks: TaskView[];
  onChange: () => void;
  onCreateTodo: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string>(TASK_STATUSES[0]);

  function close() {
    setOpen(false);
    setTitle("");
    setStatus(TASK_STATUSES[0]);
  }

  async function add() {
    if (!title.trim()) return;
    await createTask({ title: title.trim(), status });
    close();
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
    <Box title="Untracked Tasks" action={<button onClick={() => setOpen(true)}>Add</button>}>
      {open && (
        <Modal title="New Task" onClose={close}>
          <input
            autoFocus
            placeholder="New task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
          />
          <div style={{ marginTop: 8 }}>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={close}>Cancel</button>
            <button onClick={() => void add()}>Add Task</button>
          </div>
        </Modal>
      )}
      {tasks.length === 0 && <div className="muted">Nothing untracked right now.</div>}
      {tasks.map((t) => (
        <div className="row" key={t.id}>
          <div><strong>{t.title}</strong></div>
          {t.description && <div className="muted">{t.description}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <select value={t.status} onChange={(e) => void setRowStatus(t.id, e.target.value)}>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="secondary" style={{ whiteSpace: "nowrap" }} onClick={() => onCreateTodo(t.title)}>
              Create To-Do
            </button>
            <button className="secondary" aria-label={`Delete ${t.title}`} onClick={() => void remove(t.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </Box>
  );
}
