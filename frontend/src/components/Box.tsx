import type { ReactNode } from "react";

export function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="box">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
