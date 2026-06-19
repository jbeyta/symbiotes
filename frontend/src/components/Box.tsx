import type { ReactNode } from "react";

export function Box({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="box">
      <h2>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
