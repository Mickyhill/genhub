import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import HeroSlides from "./HeroSlides";
import client, { clearSession } from "../api/client";
import Tabs from "./Tabs";
import StudentCommunity from "./StudentCommunity";
import Tiles from "./Tiles";
import StudentRail from "./StudentRail";
import Footer from "./Footer";
import Gallery from "./Gallery";
import RepTools from "./RepTools";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [levels, setLevels] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [levelId, setLevelId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [results, setResults] = useState([]);
  const [section, setSection] = useState("academics");
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/student/me").then((res) => setProfile(res.data));
    client.get("/student/levels").then((res) => setLevels(res.data));
  }, []);

  useEffect(() => {
    setSemesterId("");
    setSemesters([]);
    setCourses([]);
    setTimetable([]);
    if (levelId) {
      client.get(`/student/semesters?level_id=${levelId}`).then((res) => setSemesters(res.data));
    }
  }, [levelId]);

  useEffect(() => {
    setCourses([]);
    setTimetable([]);
    setResults([]);
    if (semesterId) {
      client.get(`/student/courses?semester_id=${semesterId}`).then((res) => setCourses(res.data));
      client.get(`/student/timetable?semester_id=${semesterId}`).then((res) => setTimetable(res.data));
      client.get(`/student/results?semester_id=${semesterId}`).then((res) => setResults(res.data));
    }
  }, [semesterId]);

  function go(id) {
    setSection("academics");
    setTimeout(() => {
      const el = document.getElementById(id) || document.getElementById("choose");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }
  const tiles = [
    { label: "Lecture alarms", sub: "Your timetable and reminders", pic: "/img/tile-alarms.webp", onClick: () => go("timetable") },
    { label: "Study files", sub: "Course materials and notes", pic: "/img/tile-files.webp", onClick: () => go("courses") },
    { label: "Your results", sub: "CA, exam and grade", pic: "/img/tile-results.webp", onClick: () => go("results") },
  ];

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  async function handleDownloadCalendar() {
    const res = await client.get(`/student/timetable.ics?semester_id=${semesterId}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "timetable.ics");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const sortedTimetable = [...timetable].sort(
    (a, b) => DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week) || a.start_time.localeCompare(b.start_time)
  );

  return (
    <div>
      <div className="nav">
        <strong>GenHub</strong>
        <button className="secondary" style={{ width: "auto" }} onClick={handleLogout}>Log out</button>
      </div>
      <HeroSlides>
          <h1>{profile ? `Hello, ${profile.full_name.split(" ")[0]}.` : "Hello."}</h1>
          <p>Pick a level and semester to see your courses, timetable and results.</p>
          {profile && <div className="chips"><span className="chip amber">{profile.reg_number}</span></div>}

      </HeroSlides>
      <div className="container pull-up">
        <Tiles items={tiles} />
        <div className="layout">
        <div className="main">
        <Tabs active={section} onChange={setSection} tabs={[["academics", "Academics"], ["community", "Community"], ["pride", "FUTIA, our pride"], ...(profile?.is_rep ? [["rep", "Class rep tools"]] : [])]} />
        {section === "community" && <StudentCommunity />}
        {section === "pride" && <Gallery />}
        {section === "rep" && profile?.is_rep && <RepTools />}
        {section === "academics" && (<>

        <div className="card" id="choose">
          <h3>Choose what to view</h3>
          <p style={{ fontSize: 13, color: "#666" }}>
            Pick a level and semester to see its courses, timetable, and materials.
            You can switch this anytime — nothing here is permanent.
          </p>
          <select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
            <option value="">Select Level</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} disabled={!levelId}>
            <option value="">Select Semester</option>
            {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {!semesterId && (
          <div className="promo" style={{ backgroundImage: "url(/img/s4.jpg)", minHeight: 200 }}>
            <div className="promo-body">
              <h3>Start with your level</h3>
              <p>Pick a level and semester above. Your courses, timetable, study files and results show up right here.</p>
            </div>
          </div>
        )}

        {semesterId && (
          <>
            <div className="card" id="courses">
              <h3>Courses</h3>
              {courses.length === 0 && <p>No courses found for this level/semester yet.</p>}
              {courses.map((c) => (
                <div key={c.id} className="material-row">
                  <span>{c.code} — {c.title}</span>
                  <Link to={`/student/courses/${c.id}/materials`}>
                    <button style={{ width: "auto" }}>Materials</button>
                  </Link>
                </div>
              ))}
            </div>

            <div className="card" id="timetable">
              <h3>Timetable</h3>
              {sortedTimetable.length === 0 && <p>No timetable entries yet.</p>}
              {sortedTimetable.map((t) => (
                <div key={t.id} className="tt-row">
                  <span><strong>{t.day_of_week}</strong> {t.start_time}–{t.end_time}</span>
                  <span>{t.course_code}</span>
                  <span>{t.venue || "—"}</span>
                </div>
              ))}
              {sortedTimetable.length > 0 && (
                <button style={{ width: "auto", marginTop: 12 }} onClick={handleDownloadCalendar}>
                  📅 Add to my phone's calendar
                </button>
              )}
              <p style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
                Downloads a file you import once into Google/Apple Calendar — your
                phone's own alarms then remind you before each lecture.
              </p>
            </div>

            <div className="card" id="results">
              <h3>Results</h3>
              {results.length === 0 && <p>No results published yet for this semester.</p>}
              {results.map((r) => (
                <div key={r.id} className="tt-row">
                  <span>{r.course_code}</span>
                  <span>CA: {r.ca_score ?? "—"} / Exam: {r.exam_score ?? "—"}</span>
                  <span><strong>{r.total} ({r.grade})</strong></span>
                </div>
              ))}
            </div>
          </>
        )}
        </>)}
        </div>
        <aside className="rail">
          <StudentRail onOpenPride={() => { setSection("pride"); window.scrollTo({ top: 0, behavior: "smooth" }); }} onOpenCommunity={() => setSection("community")} onGoTimetable={() => go("timetable")} />
        </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}