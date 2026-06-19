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
