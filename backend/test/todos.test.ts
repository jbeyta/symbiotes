import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SqliteStore } from "../src/sqlite-store.js";

function app() {
  return createApp({
    store: new SqliteStore(":memory:"),
    getTickets: async () => [],
    getPrs: async () => [],
  });
}

describe("todos CRUD", () => {
  it("creates (not done), lists, toggles done, deletes", async () => {
    const a = app();
    const created = await request(a).post("/api/todos").send({ text: "Deploy the thing", url: "https://gh/pr/1" });
    expect(created.status).toBe(201);
    expect(created.body.done).toBe(false);
    expect(created.body.url).toBe("https://gh/pr/1");
    const id = created.body.id;

    const list = await request(a).get("/api/todos");
    expect(list.body).toHaveLength(1);

    const toggled = await request(a).put(`/api/todos/${id}`).send({ done: true });
    expect(toggled.body.done).toBe(true);

    expect((await request(a).delete(`/api/todos/${id}`)).status).toBe(204);
    expect((await request(a).put(`/api/todos/${id}`).send({ done: false })).status).toBe(404);
  });

  it("rejects a todo without text", async () => {
    expect((await request(app()).post("/api/todos").send({})).status).toBe(400);
  });

  it("reorders todos and rejects a bad payload", async () => {
    const a = app();
    const ids: number[] = [];
    for (const text of ["A", "B", "C"]) {
      ids.push((await request(a).post("/api/todos").send({ text })).body.id);
    }
    const reordered = await request(a).put("/api/todos/reorder").send({ ids: [ids[2], ids[0], ids[1]] });
    expect(reordered.status).toBe(200);
    expect(reordered.body.map((t: { text: string }) => t.text)).toEqual(["C", "A", "B"]);

    expect((await request(a).put("/api/todos/reorder").send({ ids: "nope" })).status).toBe(400);
  });
});
