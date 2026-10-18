// Lecture-time helpers. Everything runs on the phone's own clock, so times match what the student sees.
const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function hhmm(t) {
  return (t || "").slice(0, 5);
}

function at(base, t) {
  const [h, m] = (t || "00:00").split(":");
  const d = new Date(base);
  d.setHours(Number(h), Number(m), 0, 0);
  return d;
}

// Next (or current) occurrence of every timetable entry, soonest first.
export function upcoming(entries, now = new Date()) {
  const out = [];
  for (const e of entries || []) {
    const target = DAY_INDEX[String(e.day_of_week || "").toLowerCase()];
    if (target === undefined) continue;
    const diff = (target - now.getDay() + 7) % 7;
    const day = new Date(now);
    day.setDate(now.getDate() + diff);
    const start = at(day, e.start_time);
    const end = at(day, e.end_time);
    if (end <= now) {
      start.setDate(start.getDate() + 7);
      end.setDate(end.getDate() + 7);
    }
    out.push({ entry: e, start, end, live: start <= now && now < end });
  }
  return out.sort((a, b) => a.start - b.start);
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

export function countdown(o, now = new Date()) {
  if (o.live) {
    const left = Math.max(1, Math.round((o.end - now) / 60000));
    return `Ends in ${left} min`;
  }
  const mins = Math.max(1, Math.round((o.start - now) / 60000));
  if (mins < 60) return `In ${mins} min`;
  if (sameDay(o.start, now)) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `In ${h}h ${m}m` : `In ${h}h`;
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(o.start, tomorrow)) return `Tomorrow, ${hhmm(o.entry.start_time)}`;
  return `${DAY_NAMES[o.start.getDay()]}, ${hhmm(o.entry.start_time)}`;
}

// Lectures starting within `lead` minutes, for reminders.
export function dueSoon(entries, now = new Date(), lead = 15) {
  return upcoming(entries, now).filter((o) => !o.live && o.start > now && o.start - now <= lead * 60000);
}

export function reminderKey(o) {
  return `${o.entry.id}@${o.start.toDateString()}`;
}
