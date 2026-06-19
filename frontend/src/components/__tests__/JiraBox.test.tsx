import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JiraBox } from "../JiraBox.js";

const tickets = [
  { key: "RW-1", title: "Fix login", status: "In Progress", url: "https://x.atlassian.net/browse/RW-1", pr: null },
];

describe("JiraBox", () => {
  it("links the ticket key to its Jira page", () => {
    render(<JiraBox tickets={tickets} error={null} onCreateTodo={vi.fn()} />);
    expect(screen.getByRole("link", { name: "RW-1" })).toHaveAttribute(
      "href",
      "https://x.atlassian.net/browse/RW-1"
    );
  });

  it("creates a to-do with the key and title", async () => {
    const onCreateTodo = vi.fn();
    render(<JiraBox tickets={tickets} error={null} onCreateTodo={onCreateTodo} />);
    await userEvent.click(screen.getByRole("button", { name: "Create To-Do" }));
    expect(onCreateTodo).toHaveBeenCalledWith("RW-1 Fix login");
  });
});
