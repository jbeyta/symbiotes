import { Router } from "express";
import type { Store } from "../store.js";

export function notesRouter(store: Store): Router {
  const router = Router();

  router.get("/", (_req, res) => res.json(store.listNotes()));

  router.post("/", (req, res) => {
    const { title, description } = req.body ?? {};
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title is required" });
    }
    res.status(201).json(store.createNote({ title, description }));
  });

  router.put("/:id", (req, res) => {
    const { title, description } = req.body ?? {};
    const updated = store.updateNote(Number(req.params.id), { title, description });
    if (!updated) return res.status(404).json({ error: "not found" });
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    if (!store.deleteNote(Number(req.params.id))) return res.status(404).end();
    res.status(204).end();
  });

  return router;
}
