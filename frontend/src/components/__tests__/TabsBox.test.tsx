import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabsBox, type TabDef } from "../TabsBox.js";

function tabs(): TabDef[] {
  return [
    { id: "a", label: "Alpha", render: (nav) => <div>{nav}<p>panel-a</p></div> },
    { id: "b", label: "Beta", render: (nav) => <div>{nav}<p>panel-b</p></div> },
  ];
}

describe("TabsBox", () => {
  it("mounts only the first tab's panel by default", () => {
    render(<TabsBox tabs={tabs()} />);
    expect(screen.getByText("panel-a")).toBeInTheDocument();
    expect(screen.queryByText("panel-b")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches panels when a tab is clicked", async () => {
    render(<TabsBox tabs={tabs()} />);
    await userEvent.click(screen.getByRole("tab", { name: "Beta" }));
    expect(screen.getByText("panel-b")).toBeInTheDocument();
    expect(screen.queryByText("panel-a")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
  });

  it("falls back to the first tab when the active id disappears", async () => {
    const { rerender } = render(<TabsBox tabs={tabs()} />);
    await userEvent.click(screen.getByRole("tab", { name: "Beta" }));
    rerender(<TabsBox tabs={[tabs()[0]]} />);
    expect(screen.getByText("panel-a")).toBeInTheDocument();
  });
});
