import Database from "better-sqlite3";
import type {
  Store, Note, Todo, NewNote, NotePatch, NewTodo, TodoPatch,
} from "./store.js";

// Raw todo row as stored in SQLite (done is an integer 0/1).
interface TodoRow {
  id: number;
  text: string;
  done: number;
  url: string;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS todos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  text         TEXT NOT NULL,
  done         INTEGER NOT NULL DEFAULT 0,
  url          TEXT NOT NULL DEFAULT '',
  position     INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
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
    if (!todoCols.some((c) => c.name === "completed_at")) {
      this.db.exec("ALTER TABLE todos ADD COLUMN completed_at TEXT");
      // Best-effort backfill: already-done items get their last-updated time.
      this.db.exec("UPDATE todos SET completed_at = updated_at WHERE done = 1 AND completed_at IS NULL");
    }
  }

  private now(): string { return new Date().toISOString(); }

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
    const nextDone = p.done ?? existing.done;
    // Stamp completion time when an item is newly checked; clear it when unchecked.
    let completedAt = existing.completed_at;
    if (nextDone && !existing.done) completedAt = this.now();
    else if (!nextDone) completedAt = null;
    this.db
      .prepare("UPDATE todos SET text=?, done=?, completed_at=?, updated_at=? WHERE id=?")
      .run(p.text ?? existing.text, nextDone ? 1 : 0, completedAt, this.now(), id);
    return this.getTodo(id);
  }

  deleteTodo(id: number): boolean {
    return this.db.prepare("DELETE FROM todos WHERE id=?").run(id).changes > 0;
  }

  private getTodo(id: number): Todo | null {
    const row = this.db.prepare("SELECT * FROM todos WHERE id=?").get(id) as TodoRow | undefined;
    return row ? toTodo(row) : null;
  }

  private getNote(id: number): Note | null {
    return (this.db.prepare("SELECT * FROM notes WHERE id=?").get(id) as Note) ?? null;
  }
}

function toTodo(row: TodoRow): Todo {
  return { ...row, done: row.done === 1 };
}
