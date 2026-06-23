import { describe, it, expect, beforeEach } from "vitest";
import { SqliteStore } from "../src/sqlite-store.js";

let store: SqliteStore;
beforeEach(() => {
  store = new SqliteStore(":memory:");
});

describe("SqliteStore tasks", () => {
  it("creates with defaults and lists", () => {
    const t = store.createTask({ title: "Follow up with vendor" });
    expect(t.id).toBeGreaterThan(0);
    expect(t.status).toBe("In Progress");
    expect(t.description).toBe("");
    expect(store.listTasks()).toHaveLength(1);
  });

  it("updates a task and bumps updated_at fields exist", () => {
    const t = store.createTask({ title: "A", status: "Responded" });
    const updated = store.updateTask(t.id, { status: "Resolved" });
    expect(updated?.status).toBe("Resolved");
    expect(store.updateTask(9999, { title: "x" })).toBeNull();
  });

  it("deletes a task", () => {
    const t = store.createTask({ title: "A" });
    expect(store.deleteTask(t.id)).toBe(true);
    expect(store.deleteTask(t.id)).toBe(false);
    expect(store.listTasks()).toHaveLength(0);
  });
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
    expect(store.updateTodo(9999, { done: true })).toBeNull();

    expect(store.deleteTodo(t.id)).toBe(true);
    expect(store.deleteTodo(t.id)).toBe(false);
    expect(store.listTodos()).toHaveLength(0);
  });

  it("stores a source url when provided", () => {
    const t = store.createTodo({ text: "RW-1 Fix login", url: "https://x.atlassian.net/browse/RW-1" });
    expect(t.url).toBe("https://x.atlassian.net/browse/RW-1");
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
