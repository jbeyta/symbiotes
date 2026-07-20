import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StandupBox } from "../StandupBox.js";

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
  it("defaults to the question filter, pulling questions from both open and done", () => {
    render(<StandupBox todos={todos} />);
    expect(screen.getByText("Open question")).toBeInTheDocument();
    expect(screen.getByText("Done question")).toBeInTheDocument();
    expect(screen.queryByText("Post-release action")).not.toBeInTheDocument();
    expect(screen.queryByText("Nothing flagged")).not.toBeInTheDocument();
  });

  it("switches to post-release actions from both open and done", async () => {
    render(<StandupBox todos={todos} />);
    await userEvent.click(screen.getByRole("button", { name: "Show post-release actions" }));
    expect(screen.getByText("Post-release action")).toBeInTheDocument();
    expect(screen.getByText("Open post-release")).toBeInTheDocument();
    expect(screen.queryByText("Open question")).not.toBeInTheDocument();
    expect(screen.queryByText("Done question")).not.toBeInTheDocument();
  });

  it("tags open items as To-Do", () => {
    render(<StandupBox todos={[todos[0]]} />);
    expect(screen.getByText("To-Do")).toBeInTheDocument();
  });

  it("shows an empty message when nothing matches", () => {
    render(<StandupBox todos={[todos[4]]} />);
    expect(screen.getByText("No standup questions.")).toBeInTheDocument();
  });
});
