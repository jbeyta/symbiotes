import { useState } from "react";
import { Box } from "./Box.js";
import { LinkedId } from "./TodosBox.js";
import { FlagIcon, QuestionIcon } from "./icons.js";
import { dayKey, labelFor, rowClass } from "./todo-helpers.js";
import { type TodoView } from "../api.js";

// Aggregates flagged items across BOTH the open to-do list and the done log.
// The question filter is the standup default; the flag filter surfaces
// outstanding post-release actions. Exactly one filter is active at a time.
export function StandupBox({ todos }: { todos: TodoView[] }) {
  const [filter, setFilter] = useState<"post_release" | "question">("question");

  // Open items (no completed_at) sort ahead of done items; done items sort
  // newest-first by completion.
  const items = todos
    .filter((t) => t[filter])
    .sort((a, b) => {
      const ax = a.completed_at ?? "";
      const bx = b.completed_at ?? "";
      if (!ax && bx) return -1;
      if (ax && !bx) return 1;
      return bx.localeCompare(ax);
    });

  // Glow a filter button while any item of that kind is outstanding.
  const hasFlagged = todos.some((t) => t.post_release);
  const hasQuestions = todos.some((t) => t.question);

  const actions = (
    <span className="item-row">
      <button
        className={`icon-btn${filter === "post_release" ? " flag-on" : ""}${hasFlagged ? " glow-pink" : ""}`}
        aria-label="Show post-release actions"
        aria-pressed={filter === "post_release"}
        title="Show post-release actions"
        onClick={() => setFilter("post_release")}
      >
        <FlagIcon />
      </button>
      <button
        className={`icon-btn${filter === "question" ? " question-on" : ""}${hasQuestions ? " glow-yellow" : ""}`}
        aria-label="Show standup questions"
        aria-pressed={filter === "question"}
        title="Show standup questions"
        onClick={() => setFilter("question")}
      >
        <QuestionIcon />
      </button>
    </span>
  );

  const emptyMsg = filter === "post_release" ? "No post-release actions." : "No standup questions.";

  return (
    <Box title="Standup" action={actions}>
      {items.length === 0 && <div className="muted">{emptyMsg}</div>}
      {items.map((t) => (
        <div className="row" key={t.id}>
          <div className={rowClass(t)}>
            <span className="muted nowrap">{t.completed_at ? labelFor(dayKey(t.completed_at)) : "To-Do"}</span>
            <span className="grow truncate" title={t.text}>
              {t.url ? <LinkedId text={t.text} url={t.url} /> : t.text}
            </span>
          </div>
          {t.note ? <div className="note-readonly">{t.note}</div> : null}
        </div>
      ))}
    </Box>
  );
}
