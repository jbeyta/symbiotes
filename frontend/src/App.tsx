import { useCallback, useEffect, useState } from "react";
import { getDashboard, listTodos, createTodo, onApiError, type DashboardResponse, type TodoView } from "./api.js";
import { TabsBox } from "./components/TabsBox.js";
import { JiraPanel } from "./components/JiraPanel.js";
import { PrPanel } from "./components/PrPanel.js";
import { DoneLogBox } from "./components/DoneLogBox.js";
import { TodosBox } from "./components/TodosBox.js";
import { EyesOnBox } from "./components/EyesOnBox.js";
import { StandupModal, type StandupFilter } from "./components/StandupModal.js";
import { FlagIcon, QuestionIcon } from "./components/icons.js";
// NotesBox is kept for possible future use; swap it back into the grid to re-enable.

const EMPTY: DashboardResponse = { tickets: [], prs: [], errors: { jira: null, github: null } };

// Jira statuses that count as "current work" for the PR box filter.
const ACTIVE_STATUSES = new Set(["in progress", "in review"]);

export default function App() {
  const [dash, setDash] = useState<DashboardResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [todos, setTodos] = useState<TodoView[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  // Which standup category the modal shows; null keeps it closed.
  const [standup, setStandup] = useState<StandupFilter | null>(null);

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

  // Only open to-dos disable "Create To-Do", so a done item's PR/ticket can get
  // a fresh one. Keyed on URL (stable) rather than title (can change upstream).
  const openTodos = todos.filter((t) => !t.done);
  const openTodoUrls = new Set(openTodos.map((t) => t.url).filter(Boolean));

  const hasFlagged = todos.some((t) => t.post_release);
  const hasQuestions = todos.some((t) => t.question);

  const activeKeys = new Set(
    dash.tickets.filter((t) => ACTIVE_STATUSES.has(t.status.toLowerCase())).map((t) => t.key)
  );

  useEffect(() => { onApiError(setApiError); }, []);
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
        <img className="topbar-logo" src="/symbiotes_2.png" alt="Symbiotes" />
        {apiError && (
          <span className="error item-row">
            {apiError}
            <button className="icon-btn" aria-label="Dismiss error" title="Dismiss" onClick={() => setApiError(null)}>×</button>
          </span>
        )}
        <button
          className={`icon-btn${hasFlagged ? " glow-pink" : ""}`}
          aria-label="Show post-release actions"
          title="Show post-release actions"
          onClick={() => setStandup("post_release")}
        >
          <FlagIcon />
        </button>
        <button
          className={`icon-btn${hasQuestions ? " glow-yellow" : ""}`}
          aria-label="Show standup questions"
          title="Show standup questions"
          onClick={() => setStandup("question")}
        >
          <QuestionIcon />
        </button>
        <button onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="grid">
        <TabsBox
          tabs={[
            {
              id: "jira",
              label: "Jira",
              render: (nav) => (
                <JiraPanel nav={nav} tickets={dash.tickets} error={dash.errors.jira} onCreateTodo={createTodoFromItem} existingUrls={openTodoUrls} />
              ),
            },
            {
              id: "prs",
              label: "PRs",
              render: (nav) => (
                <PrPanel nav={nav} prs={dash.prs} error={dash.errors.github} onCreateTodo={createTodoFromItem} existingUrls={openTodoUrls} activeKeys={activeKeys} />
              ),
            },
          ]}
        />
        <EyesOnBox tickets={dash.tickets} />
        <TodosBox todos={openTodos} onChange={() => void loadTodos()} />
        <DoneLogBox todos={todos} onChange={() => void loadTodos()} />
      </div>
      {standup && (
        <StandupModal
          todos={todos}
          filter={standup}
          onChange={() => void loadTodos()}
          onClose={() => setStandup(null)}
        />
      )}
    </>
  );
}
