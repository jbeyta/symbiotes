import { useCallback, useEffect, useState } from "react";
import { getDashboard, type DashboardResponse } from "./api.js";
import { JiraBox } from "./components/JiraBox.js";
import { PrBox } from "./components/PrBox.js";

const EMPTY: DashboardResponse = { tickets: [], prs: [], errors: { jira: null, github: null } };

export default function App() {
  const [dash, setDash] = useState<DashboardResponse>(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setDash(await getDashboard()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

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
        <section className="box"><h2>Untracked Tasks</h2><div className="muted">Coming next.</div></section>
        <section className="box"><h2>Quick Notes</h2><div className="muted">Coming next.</div></section>
      </div>
    </>
  );
}
