import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TasksBox } from "../TasksBox.js";
import * as api from "../../api.js";

beforeEach(() => vi.restoreAllMocks());

const tasks = [
  { id: 1, title: "Chase vendor", description: "", status: "In Progress", created_at: "", updated_at: "" },
];

describe("TasksBox", () => {
  it("renders tasks and adds one", async () => {
    const onChange = vi.fn();
    const createSpy = vi.spyOn(api, "createTask").mockResolvedValue({ ...tasks[0], id: 2, title: "New" });
    render(<TasksBox tasks={tasks} onChange={onChange} onCreateTodo={vi.fn()} />);

    expect(screen.getByText("Chase vendor")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("New task title"), "New");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(createSpy).toHaveBeenCalledWith({ title: "New", status: "In Progress" });
    expect(onChange).toHaveBeenCalled();
  });

  it("deletes a task", async () => {
    const onChange = vi.fn();
    const delSpy = vi.spyOn(api, "deleteTask").mockResolvedValue(new Response(null, { status: 204 }));
    render(<TasksBox tasks={tasks} onChange={onChange} onCreateTodo={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Chase vendor" }));
    expect(delSpy).toHaveBeenCalledWith(1);
    expect(onChange).toHaveBeenCalled();
  });

  it("creates a to-do from a task using its title", async () => {
    const onCreateTodo = vi.fn();
    render(<TasksBox tasks={tasks} onChange={vi.fn()} onCreateTodo={onCreateTodo} />);
    await userEvent.click(screen.getByRole("button", { name: "Create To-Do" }));
    expect(onCreateTodo).toHaveBeenCalledWith("Chase vendor");
  });
});
