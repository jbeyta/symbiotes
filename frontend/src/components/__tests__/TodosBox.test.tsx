import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodosBox, moveItem } from "../TodosBox.js";
import * as api from "../../api.js";

describe("moveItem", () => {
  it("moves an item from one index to another", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });
});

beforeEach(() => vi.restoreAllMocks());

const todos = [
  { id: 1, text: "Deploy the thing", done: false, url: "", note: "", completed_at: null, post_release: false, question: false, created_at: "", updated_at: "" },
];

describe("TodosBox", () => {
  it("adds a todo via the modal", async () => {
    const onChange = vi.fn();
    const createSpy = vi.spyOn(api, "createTodo").mockResolvedValue({ ...todos[0], id: 2, text: "New item" });
    render(<TodosBox todos={todos} onChange={onChange} />);

    expect(screen.getByText("Deploy the thing")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Add a to-do")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    await userEvent.type(screen.getByPlaceholderText("Add a to-do"), "New item");
    await userEvent.click(screen.getByRole("button", { name: "Add To-Do" }));

    expect(createSpy).toHaveBeenCalledWith({ text: "New item" });
    expect(onChange).toHaveBeenCalled();
    expect(screen.queryByPlaceholderText("Add a to-do")).not.toBeInTheDocument();
  });

  it("toggles a todo's done state via its checkbox", async () => {
    const onChange = vi.fn();
    const updateSpy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...todos[0], done: true });
    render(<TodosBox todos={todos} onChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Deploy the thing/ }));
    expect(updateSpy).toHaveBeenCalledWith(1, { done: true });
    expect(onChange).toHaveBeenCalled();
  });

  it("flags a to-do with a standup question", async () => {
    const onChange = vi.fn();
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...todos[0], question: true });
    render(<TodosBox todos={todos} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Flag standup question for Deploy the thing" }));
    expect(spy).toHaveBeenCalledWith(1, { question: true });
    expect(onChange).toHaveBeenCalled();
  });

  it("clears a to-do's question flag when already set", async () => {
    const flagged = [{ ...todos[0], question: true }];
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...flagged[0], question: false });
    render(<TodosBox todos={flagged} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear standup question for Deploy the thing" }));
    expect(spy).toHaveBeenCalledWith(1, { question: false });
  });

  it("removes a todo", async () => {
    const onChange = vi.fn();
    const delSpy = vi.spyOn(api, "deleteTodo").mockResolvedValue(new Response(null, { status: 204 }));
    render(<TodosBox todos={todos} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Deploy the thing" }));
    expect(delSpy).toHaveBeenCalledWith(1);
    expect(onChange).toHaveBeenCalled();
  });

  it("shows an existing note read-only, and edits it on comment-icon click", async () => {
    const withNote = [{ ...todos[0], note: "two PRs" }];
    render(<TodosBox todos={withNote} onChange={vi.fn()} />);
    // View mode: note visible, no editor.
    expect(screen.getByText("two PRs")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Add a note…")).not.toBeInTheDocument();
    // Clicking the comment icon switches to edit mode.
    await userEvent.click(screen.getByRole("button", { name: "Edit note for Deploy the thing" }));
    expect(screen.getByPlaceholderText("Add a note…")).toHaveValue("two PRs");
  });

  it("edits a manual to-do's title via the pencil", async () => {
    const onChange = vi.fn();
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...todos[0], text: "Deploy the fix" });
    render(<TodosBox todos={todos} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Deploy the thing" }));
    const input = screen.getByDisplayValue("Deploy the thing");
    await userEvent.clear(input);
    await userEvent.type(input, "Deploy the fix{Enter}");
    expect(spy).toHaveBeenCalledWith(1, { text: "Deploy the fix" });
    expect(onChange).toHaveBeenCalled();
  });

  it("does not show a pencil on linked (ticket/PR) to-dos", () => {
    const linked = [{ ...todos[0], id: 5, text: "RW-1 fix", url: "https://x/browse/RW-1" }];
    render(<TodosBox todos={linked} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Edit RW-1 fix" })).not.toBeInTheDocument();
  });

  it("opens a note editor and saves the note", async () => {
    const onChange = vi.fn();
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...todos[0], note: "two PRs" });
    render(<TodosBox todos={todos} onChange={onChange} />);
    // No editor until the comment button is clicked.
    expect(screen.queryByPlaceholderText("Add a note…")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add note for Deploy the thing" }));
    await userEvent.type(screen.getByPlaceholderText("Add a note…"), "two PRs");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(spy).toHaveBeenCalledWith(1, { note: "two PRs" });
    expect(onChange).toHaveBeenCalled();
  });

  it("links only the leading identifier when the todo has a source url", () => {
    const linked = [{ id: 9, text: "RW-1 Fix login", done: false, url: "https://x.atlassian.net/browse/RW-1", note: "", completed_at: null, post_release: false, question: false, created_at: "", updated_at: "" }];
    render(<TodosBox todos={linked} onChange={vi.fn()} />);
    // The link is just "RW-1", not the whole text.
    expect(screen.getByRole("link", { name: "RW-1" })).toHaveAttribute("href", "https://x.atlassian.net/browse/RW-1");
    expect(screen.queryByRole("link", { name: "RW-1 Fix login" })).not.toBeInTheDocument();
    // The title text is still present (alongside the link).
    expect(screen.getByText(/Fix login/)).toBeInTheDocument();
  });

  it("renders plain text (no link) when there is no url", () => {
    render(<TodosBox todos={todos} onChange={vi.fn()} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
