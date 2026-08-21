import type { JiraTicketView } from "../api.js";
import { Box } from "./Box.js";
import { ApprovedIcon, EyesIcon, SpeechBubbleIcon } from "./icons.js";

// Tickets close to done. Wording varies between boards, so match loosely.
export function isEyesOnStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("review") || (s.includes("ready") && s.includes("release"));
}

// Read-only list of the work nearest the finish line: ticket link, PR links,
// and the PR review flags. No search, no filter, no to-do actions.
export function EyesOnBox({ tickets }: { tickets: JiraTicketView[] }) {
  const shown = tickets.filter((t) => isEyesOnStatus(t.status));

  return (
    <Box title="" icon={<EyesIcon />}>
      {shown.length === 0 && <div className="muted">Nothing close to done.</div>}
      {shown.map((t) => (
        <div className="row item-row" key={t.key}>
          <a className="nowrap" href={t.url} target="_blank" rel="noreferrer"><strong>{t.key}</strong></a>
          {t.prs.map((pr) => (
            <a className="nowrap" key={pr.url} href={pr.url} target="_blank" rel="noreferrer">#{pr.number}</a>
          ))}
          <span className="grow truncate" title={`${t.key} ${t.title} · ${t.status}`}>
            {t.title} <span className="muted">· {t.status}</span>
          </span>
          {t.prs.map((pr) =>
            pr.approved ? (
              <span
                className="pr-approved nowrap"
                key={pr.url}
                role="img"
                aria-label={`#${pr.number} is approved`}
                title="Approved — nothing new since"
              >
                <ApprovedIcon />
              </span>
            ) : pr.needsAttention ? (
              <span
                className="pr-bubble nowrap"
                key={pr.url}
                role="img"
                aria-label={`Unaddressed review comment on #${pr.number}`}
                title="A review comment is waiting on you"
              >
                <SpeechBubbleIcon />
              </span>
            ) : null
          )}
        </div>
      ))}
    </Box>
  );
}
