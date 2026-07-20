import type { TodoView } from "../api.js";

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
export function labelFor(key: string): string {
  if (key === todayKey()) return "Today";
  if (key === yesterdayKey()) return "Yesterday";
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Row-highlight modifier for a to-do. Post-release (magenta) takes precedence
// over a standup question (yellow) when an item carries both flags. Returns a
// leading-space suffix so it appends cleanly to a base class.
export function flagSuffix(t: TodoView): string {
  if (t.post_release) return " post-release";
  if (t.question) return " question";
  return "";
}

// Full row class for an `item-row` line (Done / Standup).
export function rowClass(t: TodoView): string {
  return `item-row${flagSuffix(t)}`;
}
