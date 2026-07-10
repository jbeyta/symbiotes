import { useState } from "react";
import { Box } from "./Box.js";
import { createNote, deleteNote, type NoteView } from "../api.js";

export function NotesBox({ notes, onChange }: { notes: NoteView[]; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  async function add() {
    if (!title.trim()) return;
    await createNote({ title: title.trim() });
    setTitle("");
    onChange();
  }

  async function remove(id: number) {
    await deleteNote(id);
    onChange();
  }

  return (
    <Box title="Quick Notes">
      <div className="row item-row">
        <input placeholder="New note title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button onClick={() => void add()}>Add Note</button>
      </div>
      {notes.length === 0 && <div className="muted">No notes.</div>}
      {notes.map((n) => (
        <div className="row" key={n.id}>
          <div className="note-head">
            <strong className="note-title" onClick={() => setOpenId(openId === n.id ? null : n.id)}>
              {n.title}
            </strong>
            <button className="secondary" aria-label={`Delete ${n.title}`} onClick={() => void remove(n.id)}>
              Delete
            </button>
          </div>
          {openId === n.id && <div className="muted note-body">{n.description || "(no description)"}</div>}
        </div>
      ))}
    </Box>
  );
}
