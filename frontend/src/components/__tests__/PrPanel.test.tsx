import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrPanel } from "../PrPanel.js";

const prs = [
  { number: 42, title: "add login", repo: "o/r", url: "https://github.com/o/r/pull/42", branch: "", jiraKey: "RW-1" },
];

describe("PrPanel", () => {
  it("links the PR number to its GitHub page", () => {
    render(<PrPanel prs={prs} error={null} onCreateTodo={vi.fn()} />);
    expect(screen.getByRole("link", { name: "#42" })).toHaveAttribute(
      "href",
      "https://github.com/o/r/pull/42"
    );
  });

  it("shows the Jira key before the title: #num - KEY title", () => {
    render(<PrPanel prs={prs} error={null} onCreateTodo={vi.fn()} />);
    expect(screen.getByText(/- RW-1 add login/)).toBeInTheDocument();
  });

  it("creates a to-do formatted as #num - KEY title", async () => {
    const onCreateTodo = vi.fn();
    render(<PrPanel prs={prs} error={null} onCreateTodo={onCreateTodo} />);
    await userEvent.click(screen.getByRole("button", { name: "Create To-Do" }));
    expect(onCreateTodo).toHaveBeenCalledWith("#42 - RW-1 add login", "https://github.com/o/r/pull/42");
  });

  it("omits the key (and dash) when a PR has no linked ticket", async () => {
    const onCreateTodo = vi.fn();
    const noKey = [{ ...prs[0], jiraKey: null }];
    render(<PrPanel prs={noKey} error={null} onCreateTodo={onCreateTodo} />);
    await userEvent.click(screen.getByRole("button", { name: "Create To-Do" }));
    expect(onCreateTodo).toHaveBeenCalledWith("#42 add login", "https://github.com/o/r/pull/42");
  });

  it("filters rows by the search box", async () => {
    const many = [
      ...prs,
      { number: 99, title: "bump deps", repo: "o/r", url: "https://github.com/o/r/pull/99", branch: "", jiraKey: null },
    ];
    render(<PrPanel prs={many} error={null} onCreateTodo={vi.fn()} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search PRs" }), "deps");
    expect(screen.getByText(/bump deps/)).toBeInTheDocument();
    expect(screen.queryByText(/add login/)).not.toBeInTheDocument();
  });

  it("disables Create To-Do when an open to-do for that PR's url exists", () => {
    render(<PrPanel prs={prs} error={null} onCreateTodo={vi.fn()} existingUrls={new Set(["https://github.com/o/r/pull/42"])} />);
    expect(screen.getByRole("button", { name: "To-Do added" })).toBeDisabled();
  });
});
