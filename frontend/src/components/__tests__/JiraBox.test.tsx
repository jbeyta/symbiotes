import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JiraBox, isDefaultVisibleStatus } from "../JiraBox.js";

const tickets = [
  { key: "RW-1", title: "Fix login", status: "In Progress", url: "https://x.atlassian.net/browse/RW-1", pr: null },
  { key: "RW-2", title: "Old thing", status: "Done", url: "https://x.atlassian.net/browse/RW-2", pr: null },
];

beforeEach(() => localStorage.clear());

describe("isDefaultVisibleStatus", () => {
  it("includes in-progress / review / ready-for-release equivalents, excludes others", () => {
    expect(isDefaultVisibleStatus("In Progress")).toBe(true);
    expect(isDefaultVisibleStatus("In Review")).toBe(true);
    expect(isDefaultVisibleStatus("Code Review")).toBe(true);
    expect(isDefaultVisibleStatus("Ready for Release")).toBe(true);
    expect(isDefaultVisibleStatus("Done")).toBe(false);
    expect(isDefaultVisibleStatus("Backlog")).toBe(false);
  });
});

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

  it("shows only default statuses, and reveals others when toggled in the filter", async () => {
    render(<JiraBox tickets={tickets} error={null} onCreateTodo={vi.fn()} />);
    // "In Progress" shown by default; "Done" hidden.
    expect(screen.getByText("Fix login")).toBeInTheDocument();
    expect(screen.queryByText("Old thing")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Filter by status" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Done" }));
    expect(screen.getByText("Old thing")).toBeInTheDocument();
  });

  it("persists the filter selection across reloads via localStorage", async () => {
    const { unmount } = render(<JiraBox tickets={tickets} error={null} onCreateTodo={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Filter by status" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Done" }));
    expect(screen.getByText("Old thing")).toBeInTheDocument();
    unmount();

    // A brand-new instance (a fresh page load) reads the persisted selection.
    render(<JiraBox tickets={tickets} error={null} onCreateTodo={vi.fn()} />);
    expect(screen.getByText("Old thing")).toBeInTheDocument();
  });

  it("disables Create To-Do when a matching to-do already exists", () => {
    render(
      <JiraBox tickets={tickets} error={null} onCreateTodo={vi.fn()} existingTodos={new Set(["RW-1 Fix login"])} />
    );
    expect(screen.getByRole("button", { name: "To-Do added" })).toBeDisabled();
  });
});
