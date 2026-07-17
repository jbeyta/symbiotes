import { Router } from "express";
import type { Store } from "../store.js";

// Lightweight activity log to the server console (the `npm run dev` terminal).
function log(action: string, detail: string) {
  console.log(`[todo] ${new Date().toISOString()} ${action} ${detail}`);
}
// Local day (YYYY-MM-DD) for a timestamp — mirrors the frontend's Done-log grouping.
function localDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todosRouter(store: Store): Router {
  const router = Router();

  router.get("/", (_req, res) => res.json(store.listTodos()));

  router.post("/", (req, res) => {
    const { text, url } = req.body ?? {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }
    const created = store.createTodo({ text, url: typeof url === "string" ? url : undefined });
    log("created", `#${created.id} ${JSON.stringify(created.text)}`);
    res.status(201).json(created);
  });

  // Must be declared before "/:id" so "reorder" isn't matched as an id.
  router.put("/reorder", (req, res) => {
    const { ids } = req.body ?? {};
    if (!Array.isArray(ids) || ids.some((n) => typeof n !== "number")) {
      return res.status(400).json({ error: "ids must be an array of numbers" });
    }
    store.reorderTodos(ids);
    log("reordered", `${ids.length} items`);
    res.json(store.listTodos());
  });

  router.put("/:id", (req, res) => {
    const { text, done, note, completed_at, post_release, question } = req.body ?? {};
    const updated = store.updateTodo(Number(req.params.id), {
      text,
      done: typeof done === "boolean" ? done : undefined,
      note: typeof note === "string" ? note : undefined,
      completed_at: typeof completed_at === "string" ? completed_at : undefined,
      post_release: typeof post_release === "boolean" ? post_release : undefined,
      question: typeof question === "boolean" ? question : undefined,
    });
    if (!updated) return res.status(404).json({ error: "not found" });
    const tag = `#${updated.id} ${JSON.stringify(updated.text)}`;
    if (done === true) log("done", `${tag} completed_at=${updated.completed_at} (local day ${localDay(updated.completed_at)})`);
    else if (done === false) log("reopened", tag);
    if (typeof completed_at === "string") log("moved", `${tag} -> ${updated.completed_at} (local day ${localDay(updated.completed_at)})`);
    if (typeof note === "string") log("note", `${tag} (${note.length} chars)`);
    if (post_release === true) log("flagged", `${tag} post-release action required`);
    else if (post_release === false) log("unflagged", tag);
    if (question === true) log("question", `${tag} flagged for standup`);
    else if (question === false) log("unquestioned", tag);
    if (typeof text === "string" && done === undefined && note === undefined && completed_at === undefined && post_release === undefined && question === undefined) log("renamed", tag);
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    if (!store.deleteTodo(Number(req.params.id))) return res.status(404).end();
    log("deleted", `#${req.params.id}`);
    res.status(204).end();
  });

  return router;
}
