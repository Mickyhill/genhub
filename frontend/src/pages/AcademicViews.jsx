import { Link } from "react-router-dom";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HUES = [152, 24, 205, 280, 340, 45, 180, 12];

// A steady colour for each course prefix, so MTH, CSC and GST each keep their own.
function hueFor(code) {
  const prefix = String(code || "").trim().split(/[\s\d]/)[0].toUpperCase();
  let h = 0;
  for (let i = 0; i < prefix.length; i++) h = (h * 31 + prefix.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

// "Object-Oriented Analysis and Design, 2 Unit" -> { name: "Object-Oriented Analysis and Design", unit: 2 }
function splitTitle(title) {
  const m = String(title || "").match(/^(.*?)[,\s-]*\(?\b(\d+)\s*(?:credit\s*)?units?\)?\s*$/i);
  if (m) return { name: m[1].trim() || title, unit: Number(m[2]) };
  return { name: title, unit: null };
}

function t12(t) {
  const [h, m] = String(t).split(":");
  const hh = Number(h);
  if (Number.isNaN(hh)) return t;
  return `${((hh + 11) % 12) + 1}:${m || "00"}${hh >= 12 ? "pm" : "am"}`;
}

export function Picker({ levels, semesters, levelId, semesterId, onLevel, onSemester }) {
  return (
    <div className="card pick" id="choose">
      <div className="pick-head">
        <span className="pick-ic">🎓</span>
        <div>
          <h3>Choose what to view</h3>
          <p className="step-sub">Tap your level, then your semester. You can switch any time.</p>
        </div>
      </div>
      <div className="pick-label">Level</div>
      <div className="chip-row">
        {levels.length === 0 && <span className="muted">Loading levels…</span>}
        {levels.map((l) => (
          <button
            key={l.id}
            type="button"
            className={"pick-chip" + (String(l.id) === String(levelId) ? " on" : "")}
            onClick={() => onLevel(String(l.id))}
          >
            {l.name}
          </button>
        ))}
      </div>
      <div className="pick-label">Semester</div>
      <div className="chip-row">
        {!levelId && <span className="muted">Pick a level first.</span>}
        {levelId && semesters.length === 0 && <span className="muted">No semesters for this level yet.</span>}
        {semesters.map((s) => (
          <button
            key={s.id}
            type="button"
            className={"pick-chip" + (String(s.id) === String(semesterId) ? " on" : "")}
            onClick={() => onSemester(String(s.id))}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SemesterStats({ courses, timetable, results }) {
  const units = courses.reduce((n, c) => n + (splitTitle(c.title).unit || 0), 0);
  const items = [
    { n: courses.length, l: "Courses" },
    { n: units || "—", l: "Units" },
    { n: timetable.length, l: "Lectures a week" },
    { n: results.length, l: "Results in" },
  ];
  return (
    <div className="sem-stats">
      {items.map((i) => (
        <div key={i.l} className="sem-stat"><b>{i.n}</b><span>{i.l}</span></div>
      ))}
    </div>
  );
}

export function CourseCards({ courses }) {
  return (
    <div className="card sect" id="courses">
      <div className="sect-head"><span className="sect-ic">📚</span><h3>Courses</h3><em className="count">{courses.length}</em></div>
      {courses.length === 0 && (
        <div className="empty"><span className="empty-ic">📚</span><p>No courses found for this level and semester yet.</p></div>
      )}
      <div className="course-grid">
        {courses.map((c) => {
          const { name, unit } = splitTitle(c.title);
          const hue = hueFor(c.code);
          return (
            <div key={c.id} className="course-card" style={{ "--h": hue }}>
              <div className="course-top">
                <span className="course-code">{c.code}</span>
                {unit != null && <span className="unit-chip">{unit} Unit{unit === 1 ? "" : "s"}</span>}
              </div>
              <div className="course-name">{name}</div>
              <Link to={`/student/courses/${c.id}/materials`} className="course-link">
                <span>📁 Materials</span><span aria-hidden="true">→</span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeekTimetable({ entries, onDownload, calMsg }) {
  const todayName = DAYS[(new Date().getDay() + 6) % 7];
  const byDay = DAYS.map((d) => [d, entries.filter((e) => e.day_of_week === d)]).filter(([, list]) => list.length);
  return (
    <div className="card sect" id="timetable">
      <div className="sect-head"><span className="sect-ic">🗓️</span><h3>Timetable</h3><em className="count">{entries.length}</em></div>
      {entries.length === 0 && (
        <div className="empty"><span className="empty-ic">⏰</span><p>No timetable entries yet.</p></div>
      )}
      <div className="week">
        {byDay.map(([day, list]) => (
          <div key={day} className={"day" + (day === todayName ? " today" : "")}>
            <div className="day-name">
              <b>{day.slice(0, 3)}</b>
              {day === todayName && <em>Today</em>}
            </div>
            <div className="day-list">
              {list.map((t) => (
                <div key={t.id} className="slot" style={{ "--h": hueFor(t.course_code) }}>
                  <div className="slot-time">{t12(t.start_time)}<span>to {t12(t.end_time)}</span></div>
                  <div className="slot-body">
                    <strong>{t.course_code}</strong>
                    <span>📍 {t.venue || "Venue to be announced"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {entries.length > 0 && (
        <>
          <button className="cal-btn" onClick={onDownload}>📅 Add to my phone's calendar</button>
          {calMsg && <div className="notice" style={{ marginTop: 12 }}>{calMsg}</div>}
          <p className="step-note">Import the file once into Google or Apple Calendar. Your phone's own alarms then remind you before each lecture.</p>
        </>
      )}
    </div>
  );
}

const GRADE_TONE = { A: "g-a", B: "g-b", C: "g-c", D: "g-d", F: "g-f" };

export function ResultCards({ results }) {
  return (
    <div className="card sect" id="results">
      <div className="sect-head"><span className="sect-ic">🏆</span><h3>Results</h3><em className="count">{results.length}</em></div>
      {results.length === 0 && (
        <div className="empty"><span className="empty-ic">🏆</span><p>No results published yet for this semester.</p></div>
      )}
      <div className="res-grid">
        {results.map((r) => {
          const total = Number(r.total) || 0;
          return (
            <div key={r.id} className="res-card">
              <div className="res-top">
                <span className="course-code" style={{ "--h": hueFor(r.course_code) }}>{r.course_code}</span>
                <span className={"grade " + (GRADE_TONE[r.grade] || "g-c")}>{r.grade}</span>
              </div>
              <div className="res-total"><b>{total}</b><span>/ 100</span></div>
              <div className="bar" aria-hidden="true"><i style={{ width: `${Math.min(100, total)}%` }} /></div>
              <div className="res-split">
                <span>CA <b>{r.ca_score ?? "—"}</b></span>
                <span>Exam <b>{r.exam_score ?? "—"}</b></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
