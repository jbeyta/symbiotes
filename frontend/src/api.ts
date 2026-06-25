export interface JiraTicketView { key: string; title: string; status: string; url: string; pr: number | null; }
export interface PrView { number: number; title: string; repo: string; url: string; branch: string; jiraKey: string | null; }
export interface DashboardResponse {
  tickets: JiraTicketView[];
  prs: PrView[];
  errors: { jira: string | null; github: string | null };
}
export interface NoteView { id: number; title: string; description: string; created_at: string; updated_at: string; }
export interface TodoView { id: number; text: string; done: boolean; url: string; note: string; completed_at: string | null; created_at: string; updated_at: string; }

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const getDashboard = () => fetch("/api/dashboard").then(json<DashboardResponse>);

export const listNotes = () => fetch("/api/notes").then(json<NoteView[]>);
export const createNote = (b: { title: string; description?: string }) =>
  fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<NoteView>);
export const updateNote = (id: number, b: Partial<{ title: string; description: string }>) =>
  fetch(`/api/notes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<NoteView>);
export const deleteNote = (id: number) => fetch(`/api/notes/${id}`, { method: "DELETE" });

export const listTodos = () => fetch("/api/todos").then(json<TodoView[]>);
export const createTodo = (b: { text: string; url?: string }) =>
  fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<TodoView>);
export const updateTodo = (id: number, b: Partial<{ text: string; done: boolean; note: string }>) =>
  fetch(`/api/todos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<TodoView>);
export const deleteTodo = (id: number) => fetch(`/api/todos/${id}`, { method: "DELETE" });
export const reorderTodos = (ids: number[]) =>
  fetch("/api/todos/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).then(json<TodoView[]>);
