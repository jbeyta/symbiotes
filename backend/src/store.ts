export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface NewTask { title: string; description?: string; status?: string; }
export interface TaskPatch { title?: string; description?: string; status?: string; }
export interface NewNote { title: string; description?: string; }
export interface NotePatch { title?: string; description?: string; }

export interface Store {
  listTasks(): Task[];
  createTask(t: NewTask): Task;
  updateTask(id: number, p: TaskPatch): Task | null;
  deleteTask(id: number): boolean;

  listNotes(): Note[];
  createNote(n: NewNote): Note;
  updateNote(id: number, p: NotePatch): Note | null;
  deleteNote(id: number): boolean;
}
