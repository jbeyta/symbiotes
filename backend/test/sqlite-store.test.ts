import { describe, it, expect, beforeEach } from "vitest";
import { SqliteStore } from "../src/sqlite-store.js";

let store: SqliteStore;
beforeEach(() => {
  store = new SqliteStore(":memory:");
});

describe("SqliteStore notes", () => {
  it("creates, updates, deletes notes", () => {
    const n = store.createNote({ title: "Run job first thing" });
    expect(n.id).toBeGreaterThan(0);
    expect(store.updateNote(n.id, { description: "the ETL job" })?.description).toBe("the ETL job");
    expect(store.deleteNote(n.id)).toBe(true);
    expect(store.listNotes()).toHaveLength(0);
  });
});

describe("SqliteStore todos", () => {
  it("creates undone, toggles done, lists, deletes", () => {
    const t = store.createTodo({ text: "Buy milk" });
    expect(t.id).toBeGreaterThan(0);
    expect(t.done).toBe(false);
    expect(t.url).toBe("");
    expect(store.listTodos()).toHaveLength(1);

    const updated = store.updateTodo(t.id, { done: true });
    expect(updated?.done).toBe(true);
    expect(updated?.completed_at).toBeTruthy();
    // Un-checking clears the completion timestamp.
    expect(store.updateTodo(t.id, { done: false })?.completed_at).toBeNull();
    expect(store.updateTodo(9999, { done: true })).toBeNull();

    expect(store.deleteTodo(t.id)).toBe(true);
    expect(store.deleteTodo(t.id)).toBe(false);
    expect(store.listTodos()).toHaveLength(0);
  });

  it("stores a source url when provided", () => {
    const t = store.createTodo({ text: "RW-1 Fix login", url: "https://x.atlassian.net/browse/RW-1" });
    expect(t.url).toBe("https://x.atlassian.net/browse/RW-1");
  });

  it("moves a completed item to another day via completed_at", () => {
    const t = store.createTodo({ text: "RW-1" });
    store.updateTodo(t.id, { done: true });
    const moved = store.updateTodo(t.id, { completed_at: "2026-06-23T12:00:00" });
    expect(moved?.completed_at).toBe("2026-06-23T12:00:00");
    expect(moved?.done).toBe(true);
  });

  it("saves a note and keeps it when toggling done", () => {
    const t = store.createTodo({ text: "RW-1" });
    expect(t.note).toBe("");
    expect(store.updateTodo(t.id, { note: "two PRs: #1 and #2" })?.note).toBe("two PRs: #1 and #2");
    // Toggling done must not wipe the note.
    expect(store.updateTodo(t.id, { done: true })?.note).toBe("two PRs: #1 and #2");
  });

  it("flags and clears a post-release action, independent of done", () => {
    const t = store.createTodo({ text: "RW-1" });
    expect(t.post_release).toBe(false);
    expect(store.updateTodo(t.id, { post_release: true })?.post_release).toBe(true);
    // Toggling done must not disturb the flag.
    expect(store.updateTodo(t.id, { done: true })?.post_release).toBe(true);
    expect(store.updateTodo(t.id, { post_release: false })?.post_release).toBe(false);
  });

  it("flags and clears a standup question, independent of the post-release flag", () => {
    const t = store.createTodo({ text: "RW-1" });
    expect(t.question).toBe(false);
    expect(store.updateTodo(t.id, { question: true })?.question).toBe(true);
    // The two flags are independent.
    const both = store.updateTodo(t.id, { post_release: true });
    expect(both?.question).toBe(true);
    expect(both?.post_release).toBe(true);
    expect(store.updateTodo(t.id, { question: false })?.question).toBe(false);
  });

  it("lists in creation order and supports reordering", () => {
    const a = store.createTodo({ text: "A" });
    const b = store.createTodo({ text: "B" });
    const c = store.createTodo({ text: "C" });
    expect(store.listTodos().map((t) => t.text)).toEqual(["A", "B", "C"]);

    store.reorderTodos([c.id, a.id, b.id]);
    expect(store.listTodos().map((t) => t.text)).toEqual(["C", "A", "B"]);
  });
});
