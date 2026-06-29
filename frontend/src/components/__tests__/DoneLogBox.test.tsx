import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DoneLogBox, dayKey } from "../DoneLogBox.js";
import * as api from "../../api.js";

function yKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d.toISOString());
}

function isoToday(): string {
  return new Date().toISOString();
}
function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const todos = [
  { id: 1, text: "Shipped login fix", done: true, url: "", note: "post-release: run migration", completed_at: isoToday(), created_at: "", updated_at: "" },
  { id: 2, text: "Reviewed RW-99", done: true, url: "", note: "", completed_at: isoDaysAgo(1), created_at: "", updated_at: "" },
  { id: 3, text: "Still open", done: false, url: "", note: "", completed_at: null, created_at: "", updated_at: "" },
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

  it("switches to a past day via the dropdown", async () => {
    render(<DoneLogBox todos={todos} onChange={vi.fn()} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Day" }), "Yesterday");
    expect(screen.getByText("Reviewed RW-99")).toBeInTheDocument();
    expect(screen.queryByText("Shipped login fix")).not.toBeInTheDocument();
  });

  it("reveals a read-only note when its comment icon is clicked", async () => {
    render(<DoneLogBox todos={todos} onChange={vi.fn()} />);
    expect(screen.queryByText("post-release: run migration")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show note for Shipped login fix" }));
    expect(screen.getByText("post-release: run migration")).toBeInTheDocument();
    // No editor / save control in the done log (read-only).
    expect(screen.queryByPlaceholderText("Add a note…")).not.toBeInTheDocument();
  });

  it("moves a done item to another available day", async () => {
    const onChange = vi.fn();
    const spy = vi.spyOn(api, "updateTodo").mockResolvedValue({ ...todos[0] });
    render(<DoneLogBox todos={todos} onChange={onChange} />);
    // Default day is today, showing "Shipped login fix".
    await userEvent.click(screen.getByRole("button", { name: "Move Shipped login fix to another day" }));
    // The only other available day is yesterday.
    await userEvent.click(screen.getByRole("button", { name: "Yesterday" }));
    expect(spy).toHaveBeenCalledWith(1, { completed_at: `${yKey()}T12:00:00` });
    expect(onChange).toHaveBeenCalled();
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
