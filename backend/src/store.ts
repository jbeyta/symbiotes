export interface Note {
  id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: number;
  text: string;
  done: boolean;
  url: string;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewNote { title: string; description?: string; }
export interface NotePatch { title?: string; description?: string; }
export interface NewTodo { text: string; url?: string; }
export interface TodoPatch { text?: string; done?: boolean; }

export interface Store {
  listNotes(): Note[];
  createNote(n: NewNote): Note;
  updateNote(id: number, p: NotePatch): Note | null;
  deleteNote(id: number): boolean;

  listTodos(): Todo[];
  createTodo(t: NewTodo): Todo;
  updateTodo(id: number, p: TodoPatch): Todo | null;
  deleteTodo(id: number): boolean;
  reorderTodos(ids: number[]): void;
}
