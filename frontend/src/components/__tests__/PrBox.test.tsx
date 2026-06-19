import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrBox } from "../PrBox.js";

const prs = [
  { number: 42, title: "add login", repo: "o/r", url: "https://github.com/o/r/pull/42", branch: "", jiraKey: "RW-1" },
];

describe("PrBox", () => {
  it("links the PR number to its GitHub page", () => {
    render(<PrBox prs={prs} error={null} onCreateTodo={vi.fn()} />);
    expect(screen.getByRole("link", { name: "#42" })).toHaveAttribute(
      "href",
      "https://github.com/o/r/pull/42"
    );
  });

  it("creates a to-do with the PR number and title", async () => {
    const onCreateTodo = vi.fn();
    render(<PrBox prs={prs} error={null} onCreateTodo={onCreateTodo} />);
    await userEvent.click(screen.getByRole("button", { name: "Create To-Do" }));
    expect(onCreateTodo).toHaveBeenCalledWith("#42 add login", "https://github.com/o/r/pull/42");
  });

  it("disables Create To-Do when a matching to-do already exists", () => {
    render(<PrBox prs={prs} error={null} onCreateTodo={vi.fn()} existingTodos={new Set(["#42 add login"])} />);
    expect(screen.getByRole("button", { name: "To-Do added" })).toBeDisabled();
  });
});
