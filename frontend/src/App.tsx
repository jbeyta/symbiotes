import { useCallback, useEffect, useState } from "react";
import { getDashboard, listTasks, listNotes, type DashboardResponse, type TaskView, type NoteView } from "./api.js";
import { JiraBox } from "./components/JiraBox.js";
import { PrBox } from "./components/PrBox.js";
import { TasksBox } from "./components/TasksBox.js";
import { NotesBox } from "./components/NotesBox.js";

const EMPTY: DashboardResponse = { tickets: [], prs: [], errors: { jira: null, github: null } };

export default function App() {
  const [dash, setDash] = useState<DashboardResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [notes, setNotes] = useState<NoteView[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setDash(await getDashboard()); }
    finally { setLoading(false); }
  }, []);

  const loadTasks = useCallback(async () => setTasks(await listTasks()), []);
  const loadNotes = useCallback(async () => setNotes(await listNotes()), []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void loadTasks(); }, [loadTasks]);
  useEffect(() => { void loadNotes(); }, [loadNotes]);

  return (
    <>
      <div className="topbar">
        <strong>Symbiotes</strong>
        <button onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="grid">
        <JiraBox tickets={dash.tickets} error={dash.errors.jira} />
        <PrBox prs={dash.prs} error={dash.errors.github} />
        <TasksBox tasks={tasks} onChange={() => void loadTasks()} />
        <NotesBox notes={notes} onChange={() => void loadNotes()} />
      </div>
    </>
  );
}
