import { useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n: number) => String(n).padStart(2, "0");

// A minimal month-grid calendar. `initial`/`max` are YYYY-MM-DD (local) keys.
// Clicking a day calls onPick with that day's YYYY-MM-DD key.
export function Calendar({ initial, max, onPick }: { initial: string; max?: string; onPick: (key: string) => void }) {
  const [year, setYear] = useState(() => Number(initial.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(initial.slice(5, 7)) - 1); // 0-indexed

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1);
  }

  const viewKey = `${year}-${pad(month + 1)}`;
  const nextDisabled = max ? viewKey >= max.slice(0, 7) : false;

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="icon-btn" aria-label="Previous month" onClick={prevMonth}>‹</button>
        <span>{MONTHS[month]} {year}</span>
        <button className="icon-btn" aria-label="Next month" onClick={nextMonth} disabled={nextDisabled}>›</button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => <span key={w} className="cal-wd">{w}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={`blank-${i}`} />;
          const key = `${year}-${pad(month + 1)}-${pad(d)}`;
          const disabled = max ? key > max : false;
          return (
            <button key={key} className="cal-day" disabled={disabled} onClick={() => onPick(key)}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
