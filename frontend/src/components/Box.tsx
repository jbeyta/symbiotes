import type { ReactNode } from "react";

export function Box({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="box">
      <h2>
        {icon}
        {title}
        {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
      </h2>
      {children}
    </section>
  );
}
