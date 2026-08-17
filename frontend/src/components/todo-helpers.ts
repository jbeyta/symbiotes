import { updateTodo, type TodoView } from "../api.js";

// Flip a to-do's post_release / question flag, then refresh via onChange.
export async function toggleFlag(
  t: TodoView,
  field: "post_release" | "question",
  onChange: () => void
): Promise<void> {
  await updateTodo(
    t.id,
    field === "post_release" ? { post_release: !t.post_release } : { question: !t.question }
  );
  onChange();
}

// Local-timezone day key (YYYY-MM-DD) for a timestamp, so "today" matches the
// user's actual day regardless of the stored UTC value.
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayKey(): string {
  return dayKey(new Date().toISOString());
}
export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d.toISOString());
}
// Most recent weekday before today — Friday when today is Saturday through Monday.
export function lastWorkDayKey(): string {
  const d = new Date();
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return dayKey(d.toISOString());
}
export function labelFor(key: string): string {
  if (key === todayKey()) return "Today";
  if (key === yesterdayKey()) return "Yesterday";
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Row-highlight class suffix; post-release wins when an item carries both flags.
export function flagSuffix(t: TodoView): string {
  if (t.post_release) return " post-release";
  if (t.question) return " question";
  return "";
}

export function rowClass(t: TodoView): string {
  return `item-row${flagSuffix(t)}`;
}
