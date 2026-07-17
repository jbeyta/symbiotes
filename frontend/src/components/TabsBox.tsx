import { useState, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  // Receives the tab-button nav so the panel can render it in its own sticky
  // header, next to the panel's own controls (search / filter).
  render: (nav: ReactNode) => ReactNode;
}

// A box whose sticky header is a row of tabs. Only the active tab is mounted; it
// renders the shared tab nav (passed in) plus its own header controls.
export function TabsBox({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  const nav = (
    <div className="tabs-nav" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === current?.id}
          className={t.id === current?.id ? "tab tab-active" : "tab"}
          onClick={() => setActive(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return <section className="box">{current?.render(nav)}</section>;
}
