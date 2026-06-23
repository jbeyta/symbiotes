import { Router } from "express";
import type { Store } from "../store.js";

export function todosRouter(store: Store): Router {
  const router = Router();

  router.get("/", (_req, res) => res.json(store.listTodos()));

  router.post("/", (req, res) => {
    const { text, url } = req.body ?? {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }
    res.status(201).json(store.createTodo({ text, url: typeof url === "string" ? url : undefined }));
  });

  // Must be declared before "/:id" so "reorder" isn't matched as an id.
  router.put("/reorder", (req, res) => {
    const { ids } = req.body ?? {};
    if (!Array.isArray(ids) || ids.some((n) => typeof n !== "number")) {
      return res.status(400).json({ error: "ids must be an array of numbers" });
    }
    store.reorderTodos(ids);
    res.json(store.listTodos());
  });

  router.put("/:id", (req, res) => {
    const { text, done } = req.body ?? {};
    const updated = store.updateTodo(Number(req.params.id), {
      text,
      done: typeof done === "boolean" ? done : undefined,
    });
    if (!updated) return res.status(404).json({ error: "not found" });
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    if (!store.deleteTodo(Number(req.params.id))) return res.status(404).end();
    res.status(204).end();
  });

  return router;
}
