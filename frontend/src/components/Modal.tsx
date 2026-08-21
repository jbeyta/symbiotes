import { useEffect, type ReactNode } from "react";

// Small centered modal. Closes on Escape or backdrop click; position:fixed so it
// escapes the box's overflow:auto and covers the viewport.
export function Modal({
  title,
  onClose,
  children,
  size,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** "quarter" sizes the modal like one grid box: half the viewport each way. */
  size?: "quarter";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={size === "quarter" ? "modal modal-quarter" : "modal"} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        {children}
      </div>
    </div>
  );
}
