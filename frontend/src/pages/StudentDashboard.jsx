import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HeroSlides from "./HeroSlides";
import client, { clearSession } from "../api/client";
import Tabs from "./Tabs";
import StudentCommunity from "./StudentCommunity";
import Tiles from "./Tiles";
import StudentRail from "./StudentRail";
import Footer from "./Footer";
import Gallery from "./Gallery";
import RepTools from "./RepTools";
import NextClass from "./NextClass";
import SearchBox from "./SearchBox";
import InstallPrompt from "./InstallPrompt";
import HelpBot from "./HelpBot";
import { Picker, SemesterStats, CourseCards, WeekTimetable, ResultCards } from "./AcademicViews";

const SEL_KEY = "genhub_sel";
function readSel() {
  try { return JSON.parse(localStorage.getItem(SEL_KEY) || "{}") || {}; } catch { return {}; }
}

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
  const [calMsg, setCalMsg] = useState("");
  const navigate = useNavigate();
  // The level and semester picked last time, so the next-lecture card is ready on open.
  const saved = useRef(readSel());

  useEffect(() => {
    client.get("/student/me").then((res) => setProfile(res.data));
    client.get("/student/levels").then((res) => {
      setLevels(res.data);
      const s = saved.current;
      if (s.levelId && res.data.some((l) => String(l.id) === String(s.levelId))) setLevelId(String(s.levelId));
    });
  }, []);

  useEffect(() => {
    if (levelId && semesterId) {
      try { localStorage.setItem(SEL_KEY, JSON.stringify({ levelId, semesterId })); } catch {}
    }
  }, [levelId, semesterId]);

  useEffect(() => {
    setSemesterId("");
    setSemesters([]);
    setCourses([]);
    setTimetable([]);
    if (levelId) {
      client.get(`/student/semesters?level_id=${levelId}`).then((res) => {
        setSemesters(res.data);
        const s = saved.current;
        if (s.semesterId && String(s.levelId) === String(levelId) && res.data.some((x) => String(x.id) === String(s.semesterId))) {
          setSemesterId(String(s.semesterId));
        }
        saved.current = {};
      });
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
    { label: "Courses", sub: "Materials and notes for every course", pic: "/img/tile-s-courses.webp", onClick: () => go("courses") },
    { label: "Timetable", sub: "Alarms for lectures", pic: "/img/tile-s-timetable.webp", onClick: () => go("timetable") },
    { label: "Results", sub: "CA, exam and grade", pic: "/img/tile-s-results.webp", onClick: () => go("results") },
    { label: "Community", sub: "News, forum, inbox", pic: "/img/tile-community.jpg", onClick: () => setSection("community") },
  ];

  function handleLogout() {
    clearSession();
    try { localStorage.removeItem(SEL_KEY); } catch {}
    navigate("/login");
  }

  async function handleDownloadCalendar() {
    setCalMsg("");
    try {
      const res = await client.get(`/student/timetable.ics?semester_id=${semesterId}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/calendar" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "timetable.ics");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      setCalMsg("Downloaded. Now open the file: tap the Downloaded notice, or open Files > Downloads and tap timetable.ics. Choose Calendar, then Import or Add.");
    } catch (e) {
      setCalMsg("The file could not be downloaded. Check your internet and try again.");
    }
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
        <InstallPrompt />
        <NextClass
          timetable={timetable}
          hasSelection={Boolean(semesterId)}
          onPick={() => go("choose")}
          onOpenTimetable={() => go("timetable")}
        />
        <SearchBox onOpenCommunity={() => { setSection("community"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        <Tiles items={tiles} fit />
        <div className="layout">
        <div className="main">
        <Tabs active={section} onChange={setSection} tabs={[["academics", "Academics"], ["community", "Community"], ["pride", "FUTIA, our pride"], ...(profile?.is_rep ? [["rep", "Class rep tools"]] : [])]} />
        {section === "community" && <StudentCommunity />}
        {section === "pride" && <Gallery />}
        {section === "rep" && profile?.is_rep && <RepTools />}
        {section === "academics" && (<>

        <Picker
          levels={levels} semesters={semesters} levelId={levelId} semesterId={semesterId}
          onLevel={setLevelId} onSemester={setSemesterId}
        />

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
            <SemesterStats courses={courses} timetable={timetable} results={results} />
            <CourseCards courses={courses} />
            <WeekTimetable entries={sortedTimetable} onDownload={handleDownloadCalendar} calMsg={calMsg} />
            <ResultCards results={results} />
          </>
        )}
        </>)}
        </div>
        <aside className="rail">
          <StudentRail onOpenPride={() => { setSection("pride"); window.scrollTo({ top: 0, behavior: "smooth" }); }} onOpenCommunity={() => setSection("community")} onGoTimetable={() => go("timetable")} />
        </aside>
        </div>
      </div>
      <HelpBot
        isRep={Boolean(profile?.is_rep)}
        go={(where) => {
          if (where === "community") { setSection("community"); window.scrollTo({ top: 0, behavior: "smooth" }); }
          else if (where === "pride") { setSection("pride"); window.scrollTo({ top: 0, behavior: "smooth" }); }
          else if (where === "rep") { setSection("rep"); window.scrollTo({ top: 0, behavior: "smooth" }); }
          else go(where);
        }}
      />
      <Footer />
    </div>
  );
}