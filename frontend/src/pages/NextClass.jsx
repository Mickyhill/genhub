import { useEffect, useState } from "react";
import { upcoming, countdown, hhmm, dueSoon, reminderKey } from "../lib/schedule";
import { canNotify, remindersOn, setReminders, showNotice, alreadyReminded, markReminded } from "../lib/notify";

// The card students open GenHub for: what is next, where, and how long is left.
export default function NextClass({ timetable, hasSelection, onPick, onOpenTimetable }) {
  const [now, setNow] = useState(() => new Date());
  const [remind, setRemind] = useState(() => remindersOn());
  const [note, setNote] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000);
    const wake = () => setNow(new Date());
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", wake); };
  }, []);

  // Reminder: 15 minutes before a lecture, once per lecture.
  useEffect(() => {
    if (!remind) return;
    for (const o of dueSoon(timetable, now, 15)) {
      const key = reminderKey(o);
      if (alreadyReminded(key)) continue;
      markReminded(key);
      const mins = Math.max(1, Math.round((o.start - now) / 60000));
      const e = o.entry;
      showNotice(
        `${e.course_code} starts in ${mins} min`,
        `${hhmm(e.start_time)} to ${hhmm(e.end_time)}${e.venue ? " at " + e.venue : ""}`,
        key
      );
    }
  }, [now, remind, timetable]);

  async function toggleRemind() {
    if (remind) {
      await setReminders(false);
      setRemind(false);
      setNote("");
      return;
    }
    const r = await setReminders(true);
    if (r === "on") {
      setRemind(true);
      setNote("Reminders are on. Keep GenHub open or installed on your phone.");
      showNotice("Reminders are on", "GenHub will alert you 15 minutes before each lecture.", "genhub-on");
    } else if (r === "blocked") {
      setNote("Notifications are blocked. Allow them for this site in your browser settings.");
    } else {
      setNote("This browser does not support notifications.");
    }
  }

  if (!hasSelection) {
    return (
      <div className="next-card next-empty">
        <div className="next-tag">Next lecture</div>
        <p>Pick your level and semester once. GenHub then shows your next lecture here every time you open it.</p>
        <button className="next-btn" onClick={onPick}>Pick level and semester</button>
      </div>
    );
  }

  const list = upcoming(timetable, now);
  if (list.length === 0) {
    return (
      <div className="next-card next-empty">
        <div className="next-tag">Next lecture</div>
        <p>No timetable has been added for this semester yet. Check back soon.</p>
      </div>
    );
  }

  const first = list[0];
  const then = list.find((o) => o !== first && o.start >= first.end);
  const e = first.entry;

  return (
    <div className={"next-card" + (first.live ? " live" : "")}>
      <div className="next-top">
        <span className="next-tag">{first.live ? "Happening now" : "Next lecture"}</span>
        <span className="next-count">{countdown(first, now)}</span>
      </div>
      <div className="next-code">{e.course_code}</div>
      <div className="next-title">{e.course_title}</div>
      <div className="next-meta">
        <span>{hhmm(e.start_time)} to {hhmm(e.end_time)}</span>
        <span>{e.venue || "Venue not set"}</span>
      </div>
      {then && (
        <div className="next-then">
          Then {then.entry.course_code} at {hhmm(then.entry.start_time)}{then.entry.venue ? `, ${then.entry.venue}` : ""}
        </div>
      )}
      <div className="next-actions">
        <button className="next-btn" onClick={onOpenTimetable}>Full timetable</button>
        {canNotify() && (
          <button className={"next-btn ghost" + (remind ? " on" : "")} onClick={toggleRemind}>
            {remind ? "Reminders on" : "Remind me 15 min before"}
          </button>
        )}
      </div>
      {note && <div className="next-note">{note}</div>}
    </div>
  );
}
