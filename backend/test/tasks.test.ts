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

describe("tasks CRUD", () => {
  it("creates, lists, updates, deletes", async () => {
    const a = app();
    const created = await request(a).post("/api/tasks").send({ title: "Chase vendor" });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("In Progress");
    const id = created.body.id;

    const list = await request(a).get("/api/tasks");
    expect(list.body).toHaveLength(1);

    const upd = await request(a).put(`/api/tasks/${id}`).send({ status: "Resolved" });
    expect(upd.body.status).toBe("Resolved");

    expect((await request(a).delete(`/api/tasks/${id}`)).status).toBe(204);
    expect((await request(a).put(`/api/tasks/${id}`).send({ title: "x" })).status).toBe(404);
  });

  it("rejects a task without a title", async () => {
    expect((await request(app()).post("/api/tasks").send({})).status).toBe(400);
  });
});
