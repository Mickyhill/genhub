import { useEffect, useRef, useState } from "react";
import client from "../api/client";

// A help chat for students. Fixed answers, so it is free and instant.
// Anything it cannot answer goes to the admin inbox.
const FAQ = [
  {
    id: "timetable", icon: "🗓️", label: "Timetable",
    words: ["timetable", "time table", "lecture", "class", "schedule", "next lecture", "today", "alarm", "calendar", "reminder", "venue"],
    text: "Pick your level and semester first. Then your timetable shows by day, and today is highlighted. Tap Add to my phone's calendar to get an alarm 15 minutes before each lecture.",
    actions: [{ label: "Open my timetable", go: "timetable" }],
    next: ["calendar", "install"],
  },
  {
    id: "calendar", icon: "📅", label: "Calendar alarms",
    words: ["calendar", "alarm", "ics", "remind", "notification", "google calendar"],
    text: "On your timetable, tap Add to my phone's calendar. A file downloads. Open it from the Downloaded notice or from Files, then Downloads. Choose Calendar and tap Import or Add. Your phone then reminds you before every lecture.",
    actions: [{ label: "Open my timetable", go: "timetable" }],
    next: ["timetable"],
  },
  {
    id: "courses", icon: "📚", label: "Courses and files",
    words: ["course", "courses", "material", "materials", "slides", "notes", "download", "file", "files", "pdf", "past question", "unit", "units"],
    text: "Pick your level and semester. Your courses show with their units. Tap Materials on a course to open and download slides, notes and past questions.",
    actions: [{ label: "Open my courses", go: "courses" }],
    next: ["level", "search"],
  },
  {
    id: "results", icon: "🏆", label: "Results",
    words: ["result", "results", "score", "scores", "grade", "grades", "ca", "exam", "total", "gpa"],
    text: "Pick the level and semester, then open Results. Each course shows your CA, your exam score, the total and your grade. A result appears after your lecturer publishes it. Only you see your own results.",
    actions: [{ label: "Open my results", go: "results" }],
    next: ["grading"],
  },
  {
    id: "grading", icon: "🧮", label: "How grades work",
    words: ["grading", "grade scale", "scale", "pass mark", "pass", "fail", "how is my grade", "grade point"],
    text: "Total is CA plus exam, out of 100. 70 and above is A. 60 to 69 is B. 50 to 59 is C. 45 to 49 is D. Below 45 is F.",
    next: ["results"],
  },
  {
    id: "level", icon: "🎓", label: "Level and semester",
    words: ["level", "semester", "100", "200", "300", "400", "choose", "pick", "switch", "change level", "first", "second"],
    text: "At the top of Academics, tap your level, then your semester. GenHub remembers your choice. You switch any time, and nothing is lost.",
    actions: [{ label: "Choose level", go: "choose" }],
    next: ["courses", "timetable"],
  },
  {
    id: "install", icon: "📲", label: "Install the app",
    words: ["install", "app", "home screen", "add to home", "icon", "download app", "apk", "pwa"],
    text: "Tap Install on the green bar near the top. If you see no bar, open the Chrome menu and look for Install app or Add to Home screen. Make sure Desktop site is switched off in that menu. Also try opening GenHub in Edge or Firefox.",
    next: ["password"],
  },
  {
    id: "password", icon: "🔐", label: "Forgot password",
    words: ["password", "forgot", "forget", "reset", "login", "log in", "cannot login", "cant login", "can't login", "locked", "wrong"],
    text: "Your class rep or the admin sets a new password for you. Give them your reg number. They give you the new one in person. After 5 wrong tries, you wait 10 minutes before the next try.",
    actions: [{ label: "Message the admin", compose: true }],
    next: ["pending"],
  },
  {
    id: "pending", icon: "🕒", label: "Not approved yet",
    words: ["approve", "approved", "approval", "pending", "waiting", "not on the list", "list", "register", "registered", "registration", "sign up", "signup", "account"],
    text: "A student not on the class list registers, then waits. Your class rep approves the request, and then you log in. Tell your rep your reg number and your full name.",
    next: ["password"],
  },
  {
    id: "community", icon: "💬", label: "News and forum",
    words: ["community", "news", "announcement", "announcements", "forum", "post", "inbox", "message", "suggestion", "suggest", "anonymous", "feedback"],
    text: "Community has four parts. Announcements, a Forum for your class, Message admin for private help, and a Suggestion box that is anonymous.",
    actions: [{ label: "Open Community", go: "community" }],
    next: ["admin"],
  },
  {
    id: "search", icon: "🔎", label: "Search",
    words: ["search", "find", "look for", "where is", "where can i"],
    text: "Use the search box under the next lecture card. Type at least 2 letters. It looks through your courses, files, forum posts and notices.",
    next: ["courses"],
  },
  {
    id: "pride", icon: "🏫", label: "FUTIA, our pride",
    words: ["pride", "gallery", "photos", "campus", "pictures"],
    text: "FUTIA, our pride is a gallery of campus life. Open the tab with that name above the academics section.",
    actions: [{ label: "Open the gallery", go: "pride" }],
    next: [],
  },
  {
    id: "rep", icon: "🧑‍🏫", label: "Class rep tools", repOnly: true,
    words: ["rep", "class rep", "approve", "class list", "roster", "upload", "lecturer code", "invite", "manage"],
    text: "In Class rep tools you approve students who are not on the list, manage courses, timetable and files for your department, upload the class list, give lecturers sign up codes, and post class notices.",
    actions: [{ label: "Open Class rep tools", go: "rep" }],
    next: ["pending"],
  },
];

const BY_ID = Object.fromEntries(FAQ.map((f) => [f.id, f]));
const HOME = ["timetable", "courses", "results", "install", "password", "community"];

function match(input, isRep) {
  const q = " " + input.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim() + " ";
  let best = null, bestScore = 0;
  for (const f of FAQ) {
    if (f.repOnly && !isRep) continue;
    let score = 0;
    for (const w of f.words) {
      if (w.length <= 2) { if (q.includes(" " + w + " ")) score += 0.5; }
      else if (q.includes(w)) score += w.includes(" ") ? 2 : 1;
    }
    if (score > bestScore) { best = f; bestScore = score; }
  }
  return bestScore >= 1 ? best : null;
}

export default function HelpBot({ isRep, go }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: "bot", text: "How can we help you today? Tap a topic or type your question.", chips: HOME, home: true }]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [composing, setComposing] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, typing, open]);

  function botSay(m) {
    setTyping(true);
    setTimeout(() => { setMsgs((x) => [...x, { from: "bot", ...m }]); setTyping(false); }, 350);
  }

  function ask(f) {
    setMsgs((x) => [...x, { from: "me", text: f.label }]);
    answer(f);
  }

  function answer(f) {
    const chips = [...(f.next || []), "admin"].filter((id, i, a) => a.indexOf(id) === i)
      .filter((id) => id === "admin" || (BY_ID[id] && !(BY_ID[id].repOnly && !isRep)));
    botSay({ text: f.text, actions: f.actions, chips });
  }

  function startAdmin() {
    setComposing(true);
    botSay({ text: "Type your message to the admin below and send. Include what you tried and your reg number if the problem is about your account." });
  }

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    setMsgs((x) => [...x, { from: "me", text: t }]);
    if (composing) {
      try {
        await client.post("/student/community/support", { body: t });
        setComposing(false);
        botSay({ text: "Sent to the admin. Their reply shows in Community, under Message admin.", actions: [{ label: "Open Message admin", go: "community" }] });
      } catch {
        botSay({ text: "The message did not send. Check your internet and try again." });
      }
      return;
    }
    const f = match(t, isRep);
    if (f) answer(f);
    else botSay({ text: "I am not sure about this one. Pick a topic below, or send your question to the admin.", chips: [...HOME, "admin"], home: true });
  }

  function doAction(a) {
    if (a.compose) return startAdmin();
    setOpen(false);
    go(a.go);
  }

  return (
    <>
      {!open && (
        <button type="button" className="hb-fab" onClick={() => setOpen(true)} aria-label="Open help chat">
          <span aria-hidden="true">💬</span><b>Help</b>
        </button>
      )}
      {open && (
        <div className="hb-sheet" role="dialog" aria-label="GenHub help">
          <div className="hb-head">
            <img src="/img/genhub-mark.png" alt="" />
            <div><strong>GenHub Help</strong><span>The admin can also help</span></div>
            <button type="button" className="hb-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
          <div className="hb-body">
            {msgs.map((m, i) => (
              <div key={i} className={"hb-row " + m.from}>
                <div className="hb-bubble">
                  {m.from === "bot" && <small>GenHub Help</small>}
                  <p>{m.text}</p>
                  {m.actions && m.actions.map((a) => (
                    <button key={a.label} type="button" className="hb-action" onClick={() => doAction(a)}>{a.label} →</button>
                  ))}
                </div>
                {m.chips && i === msgs.length - 1 && !typing && (
                  <div className="hb-chips">
                    {m.chips.map((id) => id === "admin"
                      ? <button key="admin" type="button" onClick={() => { setMsgs((x) => [...x, { from: "me", text: "Talk to the admin" }]); startAdmin(); }}>💬 Talk to the admin</button>
                      : <button key={id} type="button" onClick={() => ask(BY_ID[id])}>{BY_ID[id].icon} {BY_ID[id].label}</button>)}
                    {isRep && m.home && <button type="button" onClick={() => ask(BY_ID.rep)}>{BY_ID.rep.icon} {BY_ID.rep.label}</button>}
                  </div>
                )}
              </div>
            ))}
            {typing && <div className="hb-row bot"><div className="hb-bubble hb-typing"><i /><i /><i /></div></div>}
            <div ref={endRef} />
          </div>
          <form className="hb-input" onSubmit={send}>
            <input
              value={text} onChange={(e) => setText(e.target.value)} maxLength={composing ? 2000 : 120}
              placeholder={composing ? "Message to the admin…" : "Ask about GenHub…"} aria-label="Your message"
            />
            <button type="submit" disabled={!text.trim()} aria-label="Send">➤</button>
          </form>
        </div>
      )}
    </>
  );
}
