import { useCallback, useEffect, useState } from "react";
import { getDashboard, listTasks, type DashboardResponse, type TaskView } from "./api.js";
import { JiraBox } from "./components/JiraBox.js";
import { PrBox } from "./components/PrBox.js";
import { TasksBox } from "./components/TasksBox.js";

const EMPTY: DashboardResponse = { tickets: [], prs: [], errors: { jira: null, github: null } };

export default function App() {
  const [dash, setDash] = useState<DashboardResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskView[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setDash(await getDashboard()); }
    finally { setLoading(false); }
  }, []);

  const loadTasks = useCallback(async () => setTasks(await listTasks()), []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void loadTasks(); }, [loadTasks]);

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
        <section className="box"><h2>Quick Notes</h2><div className="muted">Coming next.</div></section>
      </div>
    </>
  );
}
