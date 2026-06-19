import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesBox } from "../NotesBox.js";
import * as api from "../../api.js";

beforeEach(() => vi.restoreAllMocks());

const notes = [
  { id: 1, title: "Run job AM", description: "the ETL job", created_at: "", updated_at: "" },
];

describe("NotesBox", () => {
  it("renders notes and expands description on click", async () => {
    render(<NotesBox notes={notes} onChange={vi.fn()} />);
    expect(screen.queryByText("the ETL job")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Run job AM"));
    expect(screen.getByText("the ETL job")).toBeInTheDocument();
  });

  it("adds a note", async () => {
    const onChange = vi.fn();
    const createSpy = vi.spyOn(api, "createNote").mockResolvedValue({ ...notes[0], id: 2, title: "New note" });
    render(<NotesBox notes={notes} onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText("New note title"), "New note");
    await userEvent.click(screen.getByRole("button", { name: "Add Note" }));
    expect(createSpy).toHaveBeenCalledWith({ title: "New note" });
    expect(onChange).toHaveBeenCalled();
  });
});
