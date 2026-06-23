import Database from "better-sqlite3";
import type {
  Store, Task, Note, Todo, NewTask, TaskPatch, NewNote, NotePatch, NewTodo, TodoPatch,
} from "./store.js";

// Raw todo row as stored in SQLite (done is an integer 0/1).
interface TodoRow {
  id: number;
  text: string;
  done: number;
  url: string;
  position: number;
  created_at: string;
  updated_at: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'In Progress',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS todos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  text        TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  url         TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
`;

export class SqliteStore implements Store {
  private db: Database.Database;

  constructor(filename: string) {
    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA);
    this.migrate();
  }

  // Lightweight migrations for databases created by earlier versions.
  private migrate() {
    const todoCols = this.db.prepare("PRAGMA table_info(todos)").all() as { name: string }[];
    if (!todoCols.some((c) => c.name === "url")) {
      this.db.exec("ALTER TABLE todos ADD COLUMN url TEXT NOT NULL DEFAULT ''");
    }
    if (!todoCols.some((c) => c.name === "position")) {
      this.db.exec("ALTER TABLE todos ADD COLUMN position INTEGER NOT NULL DEFAULT 0");
      // Seed existing rows with a stable order (by id) so they aren't all 0.
      this.db.exec("UPDATE todos SET position = id WHERE position = 0");
    }
  }

  private now(): string { return new Date().toISOString(); }

  listTasks(): Task[] {
    return this.db.prepare("SELECT * FROM tasks ORDER BY updated_at DESC").all() as Task[];
  }

  createTask(t: NewTask): Task {
    const now = this.now();
    const info = this.db
      .prepare(
        "INSERT INTO tasks (title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(t.title, t.description ?? "", t.status ?? "In Progress", now, now);
    return this.getTask(Number(info.lastInsertRowid))!;
  }

  updateTask(id: number, p: TaskPatch): Task | null {
    const existing = this.getTask(id);
    if (!existing) return null;
    const next = {
      title: p.title ?? existing.title,
      description: p.description ?? existing.description,
      status: p.status ?? existing.status,
    };
    this.db
      .prepare("UPDATE tasks SET title=?, description=?, status=?, updated_at=? WHERE id=?")
      .run(next.title, next.description, next.status, this.now(), id);
    return this.getTask(id);
  }

  deleteTask(id: number): boolean {
    return this.db.prepare("DELETE FROM tasks WHERE id=?").run(id).changes > 0;
  }

  listNotes(): Note[] {
    return this.db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all() as Note[];
  }

  createNote(n: NewNote): Note {
    const now = this.now();
    const info = this.db
      .prepare("INSERT INTO notes (title, description, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .run(n.title, n.description ?? "", now, now);
    return this.getNote(Number(info.lastInsertRowid))!;
  }

  updateNote(id: number, p: NotePatch): Note | null {
    const existing = this.getNote(id);
    if (!existing) return null;
    const next = {
      title: p.title ?? existing.title,
      description: p.description ?? existing.description,
    };
    this.db
      .prepare("UPDATE notes SET title=?, description=?, updated_at=? WHERE id=?")
      .run(next.title, next.description, this.now(), id);
    return this.getNote(id);
  }

  deleteNote(id: number): boolean {
    return this.db.prepare("DELETE FROM notes WHERE id=?").run(id).changes > 0;
  }

  listTodos(): Todo[] {
    const rows = this.db
      .prepare("SELECT * FROM todos ORDER BY position ASC, id ASC")
      .all() as TodoRow[];
    return rows.map(toTodo);
  }

  createTodo(t: NewTodo): Todo {
    const now = this.now();
    const pos = (this.db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS p FROM todos").get() as { p: number }).p;
    const info = this.db
      .prepare("INSERT INTO todos (text, done, url, position, created_at, updated_at) VALUES (?, 0, ?, ?, ?, ?)")
      .run(t.text, t.url ?? "", pos, now, now);
    return this.getTodo(Number(info.lastInsertRowid))!;
  }

  reorderTodos(ids: number[]): void {
    const update = this.db.prepare("UPDATE todos SET position = ? WHERE id = ?");
    const tx = this.db.transaction((ordered: number[]) => {
      ordered.forEach((id, i) => update.run(i, id));
    });
    tx(ids);
  }

  updateTodo(id: number, p: TodoPatch): Todo | null {
    const existing = this.getTodo(id);
    if (!existing) return null;
    const next = {
      text: p.text ?? existing.text,
      done: p.done ?? existing.done,
    };
    this.db
      .prepare("UPDATE todos SET text=?, done=?, updated_at=? WHERE id=?")
      .run(next.text, next.done ? 1 : 0, this.now(), id);
    return this.getTodo(id);
  }

  deleteTodo(id: number): boolean {
    return this.db.prepare("DELETE FROM todos WHERE id=?").run(id).changes > 0;
  }

  private getTodo(id: number): Todo | null {
    const row = this.db.prepare("SELECT * FROM todos WHERE id=?").get(id) as TodoRow | undefined;
    return row ? toTodo(row) : null;
  }

  private getTask(id: number): Task | null {
    return (this.db.prepare("SELECT * FROM tasks WHERE id=?").get(id) as Task) ?? null;
  }
  private getNote(id: number): Note | null {
    return (this.db.prepare("SELECT * FROM notes WHERE id=?").get(id) as Note) ?? null;
  }
}

function toTodo(row: TodoRow): Todo {
  return { ...row, done: row.done === 1 };
}
