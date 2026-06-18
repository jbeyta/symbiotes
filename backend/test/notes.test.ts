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

describe("notes CRUD", () => {
  it("creates, updates, deletes", async () => {
    const a = app();
    const created = await request(a).post("/api/notes").send({ title: "Run job AM" });
    expect(created.status).toBe(201);
    const id = created.body.id;
    const upd = await request(a).put(`/api/notes/${id}`).send({ description: "ETL" });
    expect(upd.body.description).toBe("ETL");
    expect((await request(a).delete(`/api/notes/${id}`)).status).toBe(204);
  });

  it("rejects a note without a title", async () => {
    expect((await request(app()).post("/api/notes").send({})).status).toBe(400);
  });
});
