export interface TicketPrView { number: number; url: string; needsAttention: boolean; approved: boolean; }
export interface JiraTicketView { key: string; title: string; status: string; url: string; prs: TicketPrView[]; }
export interface PrView { number: number; title: string; repo: string; url: string; branch: string; jiraKey: string | null; needsAttention: boolean; approved: boolean; }
export interface DashboardResponse {
  tickets: JiraTicketView[];
  prs: PrView[];
  errors: { jira: string | null; github: string | null };
}
export interface NoteView { id: number; title: string; description: string; created_at: string; updated_at: string; }
export interface TodoView { id: number; text: string; done: boolean; url: string; note: string; completed_at: string | null; post_release: boolean; question: boolean; created_at: string; updated_at: string; }

// Single listener for failed requests; App.tsx subscribes once and renders
// the message in the topbar.
type ApiErrorListener = (message: string) => void;
let notifyError: ApiErrorListener = () => {};
export function onApiError(listener: ApiErrorListener): void {
  notifyError = listener;
}

// All server calls go through this: report a failure to the listener, rethrow.
async function api(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (e) {
    notifyError("Request failed: server unreachable");
    throw e;
  }
  if (!res.ok) {
    const msg = `Request failed: ${res.status}`;
    notifyError(msg);
    throw new Error(msg);
  }
  return res;
}

const json = <T,>(res: Response) => res.json() as Promise<T>;

export const getDashboard = () => api("/api/dashboard").then(json<DashboardResponse>);

export const listNotes = () => api("/api/notes").then(json<NoteView[]>);
export const createNote = (b: { title: string; description?: string }) =>
  api("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<NoteView>);
export const updateNote = (id: number, b: Partial<{ title: string; description: string }>) =>
  api(`/api/notes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<NoteView>);
export const deleteNote = (id: number) => api(`/api/notes/${id}`, { method: "DELETE" });

export const listTodos = () => api("/api/todos").then(json<TodoView[]>);
export const createTodo = (b: { text: string; url?: string }) =>
  api("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<TodoView>);
export const updateTodo = (id: number, b: Partial<{ text: string; done: boolean; note: string; completed_at: string; post_release: boolean; question: boolean }>) =>
  api(`/api/todos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(json<TodoView>);
export const deleteTodo = (id: number) => api(`/api/todos/${id}`, { method: "DELETE" });
export const reorderTodos = (ids: number[]) =>
  api("/api/todos/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).then(json<TodoView[]>);
