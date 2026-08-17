import { useState, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  // Receives the tab nav so the panel can render it in its own sticky header.
  render: (nav: ReactNode) => ReactNode;
}

// Box with a tab row for a header. Only the active tab is mounted.
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
