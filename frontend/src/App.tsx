import { useCallback, useEffect, useState } from "react";
import { getDashboard, listTodos, createTodo, type DashboardResponse, type TodoView } from "./api.js";
import { JiraBox } from "./components/JiraBox.js";
import { PrBox } from "./components/PrBox.js";
import { DoneLogBox } from "./components/DoneLogBox.js";
import { TodosBox } from "./components/TodosBox.js";
// NotesBox is kept for possible future use; swap it back into the grid to re-enable.

const EMPTY: DashboardResponse = { tickets: [], prs: [], errors: { jira: null, github: null } };

export default function App() {
  const [dash, setDash] = useState<DashboardResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [todos, setTodos] = useState<TodoView[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setDash(await getDashboard()); }
    finally { setLoading(false); }
  }, []);

  const loadTodos = useCallback(async () => setTodos(await listTodos()), []);
  const createTodoFromItem = useCallback(async (text: string, url?: string) => {
    await createTodo({ text, url });
    await loadTodos();
  }, [loadTodos]);

  // Only OPEN to-dos disable "Create To-Do" — once an item's to-do is marked
  // done (it moves to the Done log), the button re-enables so you can make a
  // fresh one (e.g. the same PR needs another round of changes). Keyed on the
  // item's URL (stable) rather than its title (which can change upstream).
  const openTodos = todos.filter((t) => !t.done);
  const openTodoUrls = new Set(openTodos.map((t) => t.url).filter(Boolean));

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void loadTodos(); }, [loadTodos]);

  return (
    <>
      <div className="bg-blobs" aria-hidden="true">
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
        <span className="blob blob-4" />
      </div>
      <div className="topbar">
        <strong>Symbiotes</strong>
        <button onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="grid">
        <JiraBox tickets={dash.tickets} error={dash.errors.jira} onCreateTodo={createTodoFromItem} existingUrls={openTodoUrls} />
        <PrBox prs={dash.prs} error={dash.errors.github} onCreateTodo={createTodoFromItem} existingUrls={openTodoUrls} />
        <TodosBox todos={openTodos} onChange={() => void loadTodos()} />
        <DoneLogBox todos={todos} onChange={() => void loadTodos()} />
      </div>
    </>
  );
}
