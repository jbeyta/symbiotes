import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StandupBox } from "../StandupBox.js";
import * as api from "../../api.js";

const noop = () => {};

function iso(): string {
  return new Date().toISOString();
}

const base = { url: "", note: "", created_at: "", updated_at: "" };
const todos = [
  // open to-do flagged as a question
  { ...base, id: 1, text: "Open question", done: false, completed_at: null, post_release: false, question: true },
  // done item flagged as a question
  { ...base, id: 2, text: "Done question", done: true, completed_at: iso(), post_release: false, question: true },
  // done item flagged post-release
  { ...base, id: 3, text: "Post-release action", done: true, completed_at: iso(), post_release: true, question: false },
  // open to-do carrying a post-release flag (re-opened after being flagged)
  { ...base, id: 4, text: "Open post-release", done: false, completed_at: null, post_release: true, question: false },
  // plain item, never flagged — should never appear
  { ...base, id: 5, text: "Nothing flagged", done: true, completed_at: iso(), post_release: false, question: false },
];

describe("StandupBox", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to the question filter, pulling questions from both open and done", () => {
    render(<StandupBox todos={todos} onChange={noop} />);
    expect(screen.getByText("Open question")).toBeInTheDocument();
    expect(screen.getByText("Done question")).toBeInTheDocument();
    expect(screen.queryByText("Post-release action")).not.toBeInTheDocument();
    expect(screen.queryByText("Nothing flagged")).not.toBeInTheDocument();
  });

  it("switches to post-release actions from both open and done", async () => {
    render(<StandupBox todos={todos} onChange={noop} />);
    await userEvent.click(screen.getByRole("button", { name: "Show post-release actions" }));
    expect(screen.getByText("Post-release action")).toBeInTheDocument();
    expect(screen.getByText("Open post-release")).toBeInTheDocument();
    expect(screen.queryByText("Open question")).not.toBeInTheDocument();
    expect(screen.queryByText("Done question")).not.toBeInTheDocument();
  });

  it("tags open items as To-Do", () => {
    render(<StandupBox todos={[todos[0]]} onChange={noop} />);
    expect(screen.getByText("To-Do")).toBeInTheDocument();
  });

  it("shows an empty message when nothing matches", () => {
    render(<StandupBox todos={[todos[4]]} onChange={noop} />);
    expect(screen.getByText("No standup questions.")).toBeInTheDocument();
  });

  it("clears the question flag from a row and refreshes", async () => {
    const update = vi.spyOn(api, "updateTodo").mockResolvedValue(todos[0]);
    const onChange = vi.fn();
    render(<StandupBox todos={[todos[0]]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear standup question for Open question" }));
    expect(update).toHaveBeenCalledWith(1, { question: false });
    expect(onChange).toHaveBeenCalled();
  });

  it("clears the post-release flag from a row and refreshes", async () => {
    const update = vi.spyOn(api, "updateTodo").mockResolvedValue(todos[3]);
    const onChange = vi.fn();
    render(<StandupBox todos={[todos[3]]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Show post-release actions" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear post-release action for Open post-release" }));
    expect(update).toHaveBeenCalledWith(4, { post_release: false });
    expect(onChange).toHaveBeenCalled();
  });
});
