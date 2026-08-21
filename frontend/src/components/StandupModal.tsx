import { Modal } from "./Modal.js";
import { LinkedId } from "./TodosBox.js";
import { FlagIcon, QuestionIcon } from "./icons.js";
import { dayKey, labelFor, rowClass, toggleFlag } from "./todo-helpers.js";
import { type TodoView } from "../api.js";

export type StandupFilter = "post_release" | "question";

const TITLE: Record<StandupFilter, string> = {
  post_release: "Post-release actions",
  question: "Standup questions",
};

const EMPTY: Record<StandupFilter, string> = {
  post_release: "No post-release actions.",
  question: "No standup questions.",
};

// Flagged items across both the open to-do list and the done log; the topbar
// button picks which flag the modal shows.
export function StandupModal({
  todos,
  filter,
  onChange,
  onClose,
}: {
  todos: TodoView[];
  filter: StandupFilter;
  onChange: () => void;
  onClose: () => void;
}) {
  // Open items first, then done items newest-first by completion.
  const items = todos
    .filter((t) => t[filter])
    .sort((a, b) => {
      const ax = a.completed_at ?? "";
      const bx = b.completed_at ?? "";
      if (!ax && bx) return -1;
      if (ax && !bx) return 1;
      return bx.localeCompare(ax);
    });

  return (
    <Modal title={TITLE[filter]} onClose={onClose} size="quarter">
      {items.length === 0 && <div className="muted">{EMPTY[filter]}</div>}
      {items.map((t) => (
        <div className="row" key={t.id}>
          <div className={rowClass(t)}>
            <span className="muted nowrap">{t.completed_at ? labelFor(dayKey(t.completed_at)) : "To-Do"}</span>
            <span className="grow truncate" title={t.text}>
              {t.url ? <LinkedId text={t.text} url={t.url} /> : t.text}
            </span>
            <button
              className={t.post_release ? "icon-btn flag-on" : "icon-btn"}
              aria-label={`${t.post_release ? "Clear" : "Flag"} post-release action for ${t.text}`}
              aria-pressed={t.post_release}
              title={t.post_release ? "Clear post-release flag" : "Flag: post-release action required"}
              onClick={() => void toggleFlag(t, "post_release", onChange)}
            >
              <FlagIcon />
            </button>
            <button
              className={t.question ? "icon-btn question-on" : "icon-btn"}
              aria-label={`${t.question ? "Clear" : "Flag"} standup question for ${t.text}`}
              aria-pressed={t.question}
              title={t.question ? "Clear question flag" : "Flag: question for standup"}
              onClick={() => void toggleFlag(t, "question", onChange)}
            >
              <QuestionIcon />
            </button>
          </div>
          {t.note ? <div className="note-readonly">{t.note}</div> : null}
        </div>
      ))}
      <div className="modal-actions">
        <button onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
