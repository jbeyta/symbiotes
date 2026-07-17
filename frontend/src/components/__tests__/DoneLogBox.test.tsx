import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DoneLogBox, dayKey } from "../DoneLogBox.js";
import * as api from "../../api.js";

function isoToday(): string {
  return new Date().toISOString();
}
function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const todos = [
  { id: 1, text: "Shipped login fix", done: true, url: "", note: "post-release: run migration", completed_at: isoToday(), post_release: false, question: false, created_at: "", updated_at: "" },
  { id: 2, text: "Reviewed RW-99", done: true, url: "", note: "", completed_at: isoDaysAgo(1), post_release: false, question: false, created_at: "", updated_at: "" },
  { id: 3, text: "Still open", done: false, url: "", note: "", completed_at: null, post_release: false, question: false, created_at: "", updated_at: "" },
];

describe("dayKey", () => {
  it("formats a timestamp as a local YYYY-MM-DD key", () => {
    expect(dayKey("2026-06-23T15:30:00")).toBe("2026-06-23");
  });
});

describe("DoneLogBox", () => {
  it("defaults to today and shows only items completed today", () => {
    render(<DoneLogBox todos={todos} onChange={vi.fn()} />);
    expect(screen.getByText("Shipped login fix")).toBeInTheDocument();
    expect(screen.queryByText("Reviewed RW-99")).not.toBeInTheDocument(); // yesterday
    expect(screen.queryByText("Still open")).not.toBeInTheDocument();      // not done
  });

  it("switches to another day via the calendar picker", async () => {
    render(<DoneLogBox todos={todos} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Pick day" }));
    // Navigate to last month and pick the 15th — a day with no completions and,
    // regardless of the run date, never today. Today's item should drop out.
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    await userEvent.click(screen.getByRole("button", { name: "15" }));
    expect(screen.queryByText("Shipped login fix")).not.toBeInTheDocument();
  });

  it("shows a note read-only and opens an editor on comment-icon click", async () => {
    render(<DoneLogBox todos={todos} onChange={vi.fn()} />);
    // Read-only note visible by default (no editor).
    expect(screen.getByText("post-release: run migration")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Add a note…")).not.toBeInTheDocument();
    // Comment icon opens an editor pre-filled with the note.
    await userEvent.click(screen.getByRole("button", { name: "Edit note for Shipped login fix" }));
    expect(screen.getByPlaceholderText("Add a note…")).toHaveValue("post-release: run migration");
  });

  it("edits and saves a note on a done item", async () => {
    const onChange = vi.fn();
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...todos[0] });
    render(<DoneLogBox todos={todos} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit note for Shipped login fix" }));
    const ta = screen.getByPlaceholderText("Add a note…");
    await userEvent.clear(ta);
    await userEvent.type(ta, "updated note");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(spy).toHaveBeenCalledWith(1, { note: "updated note" });
    expect(onChange).toHaveBeenCalled();
  });

  it("moves a done item to a day picked on the calendar", async () => {
    const onChange = vi.fn();
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...todos[0] });
    render(<DoneLogBox todos={todos} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Move Shipped login fix to another day" }));
    // Calendar opens on the current month; day 1 is always available (<= today).
    await userEvent.click(screen.getByRole("button", { name: "1" }));
    const firstOfMonth = `${dayKey(new Date().toISOString()).slice(0, 7)}-01`;
    expect(spy).toHaveBeenCalledWith(1, { completed_at: `${firstOfMonth}T12:00:00` });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it("filters to only flagged items, across all days", async () => {
    const data = [
      { ...todos[0] },                       // today, unflagged
      { ...todos[1], post_release: true },   // yesterday, flagged
    ];
    render(<DoneLogBox todos={data} onChange={vi.fn()} />);
    // Default day view: today's unflagged item shows; yesterday's is hidden.
    expect(screen.getByText("Shipped login fix")).toBeInTheDocument();
    expect(screen.queryByText("Reviewed RW-99")).not.toBeInTheDocument();
    // Flagged-only ignores the day: yesterday's flagged item shows, today's drops.
    await userEvent.click(screen.getByRole("button", { name: "Show only flagged items" }));
    expect(screen.getByText("Reviewed RW-99")).toBeInTheDocument();
    expect(screen.queryByText("Shipped login fix")).not.toBeInTheDocument();
  });

  it("filters to only question items, across all days", async () => {
    const data = [
      { ...todos[0] },                    // today, no question
      { ...todos[1], question: true },    // yesterday, question
    ];
    render(<DoneLogBox todos={data} onChange={vi.fn()} />);
    expect(screen.getByText("Shipped login fix")).toBeInTheDocument();
    expect(screen.queryByText("Reviewed RW-99")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show only question items" }));
    expect(screen.getByText("Reviewed RW-99")).toBeInTheDocument();
    expect(screen.queryByText("Shipped login fix")).not.toBeInTheDocument();
  });

  it("glows the filter buttons only while matching items are outstanding", () => {
    const { rerender } = render(<DoneLogBox todos={todos} onChange={vi.fn()} />);
    // Nothing flagged in the base fixture.
    expect(screen.getByRole("button", { name: "Show only flagged items" })).not.toHaveClass("glow-pink");
    expect(screen.getByRole("button", { name: "Show only question items" })).not.toHaveClass("glow-yellow");

    rerender(
      <DoneLogBox
        todos={[{ ...todos[0], post_release: true }, { ...todos[1], question: true }]}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Show only flagged items" })).toHaveClass("glow-pink");
    expect(screen.getByRole("button", { name: "Show only question items" })).toHaveClass("glow-yellow");
  });

  it("flags a done item with a standup question", async () => {
    const onChange = vi.fn();
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...todos[0], question: true });
    render(<DoneLogBox todos={todos} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Flag standup question for Shipped login fix" }));
    expect(spy).toHaveBeenCalledWith(1, { question: true });
    expect(onChange).toHaveBeenCalled();
  });

  it("flags a done item as post-release action required", async () => {
    const onChange = vi.fn();
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...todos[0], post_release: true });
    render(<DoneLogBox todos={todos} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Flag post-release action for Shipped login fix" }));
    expect(spy).toHaveBeenCalledWith(1, { post_release: true });
    expect(onChange).toHaveBeenCalled();
  });

  it("clears the flag when it is already set", async () => {
    const flagged = [{ ...todos[0], post_release: true }];
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...flagged[0], post_release: false });
    render(<DoneLogBox todos={flagged} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear post-release action for Shipped login fix" }));
    expect(spy).toHaveBeenCalledWith(1, { post_release: false });
  });

  it("unchecking an item moves it back (calls updateTodo done:false)", async () => {
    const onChange = vi.fn();
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...todos[0], done: false });
    render(<DoneLogBox todos={todos} onChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Shipped login fix/ }));
    expect(spy).toHaveBeenCalledWith(1, { done: false });
    expect(onChange).toHaveBeenCalled();
  });
});
