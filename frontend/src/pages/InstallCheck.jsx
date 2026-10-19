import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// A plain checklist that shows why Chrome does or does not offer to install GenHub.
export default function InstallCheck() {
  const [rows, setRows] = useState([]);
  const [evt, setEvt] = useState(() => window.__installEvt || null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onReady = () => setEvt(window.__installEvt || null);
    window.addEventListener("genhub-install-ready", onReady);
    return () => window.removeEventListener("genhub-install-ready", onReady);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out = [];
      const add = (ok, label, detail) => out.push({ ok, label, detail });
      const ua = navigator.userAgent;
      const chrome = (ua.match(/Chrome\/(\d+)/) || [])[1];
      add(location.protocol === "https:", "Secure site (https)", location.protocol === "https:" ? "Yes" : "No. Install needs https.");
      add(/Android/i.test(ua), "Phone mode", /Android/i.test(ua) ? "Yes. Chrome sees a phone." : "No. Desktop site is switched on. Untick Desktop site in the Chrome menu.");
      add(Boolean(chrome), "Chrome browser", chrome ? `Chrome ${chrome}` : "This does not look like Chrome. Open GenHub in Chrome.");
      const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
      add(!standalone, "Not installed yet", standalone ? "GenHub already runs as an app on this phone." : "Right, GenHub runs in the browser.");

      try {
        const r = await fetch("/manifest.json", { cache: "no-store" });
        const m = await r.json();
        add(r.ok && Boolean(m.name), "App file (manifest)", r.ok ? `Found: ${m.name}` : `Failed with status ${r.status}`);
        for (const ic of m.icons || []) {
          try {
            const ir = await fetch(ic.src, { cache: "no-store" });
            const ct = ir.headers.get("content-type") || "";
            add(ir.ok && ct.startsWith("image/"), `Icon ${ic.sizes}`, ir.ok && ct.startsWith("image/") ? "Loads" : `Problem: status ${ir.status}, type ${ct || "none"}`);
          } catch {
            add(false, `Icon ${ic.sizes}`, "Could not load");
          }
        }
      } catch {
        add(false, "App file (manifest)", "Could not read /manifest.json");
      }

      try {
        const sr = await fetch("/sw.js", { cache: "no-store" });
        const ct = sr.headers.get("content-type") || "";
        add(sr.ok && /javascript|ecmascript/.test(ct), "Offline helper file (sw.js)", sr.ok ? `Type: ${ct || "none"}` : `Failed with status ${sr.status}`);
      } catch {
        add(false, "Offline helper file (sw.js)", "Could not load");
      }
      let reg = null;
      try { reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null; } catch {}
      add(Boolean(reg), "Offline helper running", reg ? (navigator.serviceWorker.controller ? "Yes, and it controls this page." : "Registered. Reload the page once so it takes control.") : "Not registered yet. Reload the page and wait 10 seconds.");

      add(Boolean(evt), "Chrome install signal", evt ? "Received. The Install button below will work." : "Not received yet. Wait 20 seconds, then tap Check again.");
      if (alive) setRows(out);
    })();
    return () => { alive = false; };
  }, [tick, evt]);

  async function install() {
    if (!evt) return;
    evt.prompt();
    try { await evt.userChoice; } catch {}
    window.__installEvt = null;
    setEvt(null);
  }

  const bad = rows.filter((r) => !r.ok);

  return (
    <div className="container" style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
      <h2>Install check</h2>
      <p style={{ color: "#5b6b66", fontSize: 14 }}>
        This page shows what Chrome sees on this phone. A tick means good. A cross shows what blocks the install.
      </p>
      <div className="card">
        {rows.length === 0 && <p>Checking...</p>}
        {rows.map((r, i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #e4ece8" }}>
            <strong>{r.ok ? "✅" : "❌"} {r.label}</strong>
            <div style={{ fontSize: 13, color: "#5b6b66", marginLeft: 26 }}>{r.detail}</div>
          </div>
        ))}
      </div>
      {rows.length > 0 && (
        <p style={{ fontWeight: 600 }}>
          {bad.length === 0 ? "Everything is ready." : `${bad.length} item${bad.length > 1 ? "s" : ""} to fix. Send a screenshot of this page to Claude.`}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {evt && <button style={{ width: "auto" }} onClick={install}>Install GenHub</button>}
        <button style={{ width: "auto" }} onClick={() => setTick((t) => t + 1)}>Check again</button>
        <Link to="/login"><button style={{ width: "auto", background: "#5b6b66" }}>Back to GenHub</button></Link>
      </div>
    </div>
  );
}
