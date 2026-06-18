import { Router } from "express";
import type { Store } from "../store.js";

export function tasksRouter(store: Store): Router {
  const router = Router();

  router.get("/", (_req, res) => res.json(store.listTasks()));

  router.post("/", (req, res) => {
    const { title, description, status } = req.body ?? {};
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title is required" });
    }
    res.status(201).json(store.createTask({ title, description, status }));
  });

  router.put("/:id", (req, res) => {
    const { title, description, status } = req.body ?? {};
    const updated = store.updateTask(Number(req.params.id), { title, description, status });
    if (!updated) return res.status(404).json({ error: "not found" });
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    if (!store.deleteTask(Number(req.params.id))) return res.status(404).end();
    res.status(204).end();
  });

  return router;
}
