import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Calendar } from "../Calendar.js";

describe("Calendar", () => {
  it("picks a day and returns its YYYY-MM-DD key", async () => {
    const onPick = vi.fn();
    render(<Calendar initial="2026-03-15" onPick={onPick} />);
    expect(screen.getByText("March 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "9" }));
    expect(onPick).toHaveBeenCalledWith("2026-03-09");
  });

  it("disables days not in enabledDays", () => {
    const onPick = vi.fn();
    render(<Calendar initial="2026-03-15" enabledDays={new Set(["2026-03-09"])} onPick={onPick} />);
    expect(screen.getByRole("button", { name: "9" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "10" })).toBeDisabled();
  });

  it("navigates months and disables days after max", async () => {
    const onPick = vi.fn();
    render(<Calendar initial="2026-03-15" max="2026-03-10" onPick={onPick} />);
    // Day 20 is after max → disabled.
    expect(screen.getByRole("button", { name: "20" })).toBeDisabled();
    // Can go back a month.
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("February 2026")).toBeInTheDocument();
    // Next month is capped at the max month.
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("March 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  });
});
