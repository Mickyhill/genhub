import { useEffect, useState } from "react";

const HIDE_KEY = "genhub_install_hidden";

function isStandalone() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

function recentlyHidden() {
  try {
    const t = Number(localStorage.getItem(HIDE_KEY) || 0);
    return Date.now() - t < 7 * 24 * 3600 * 1000;
  } catch {
    return false;
  }
}

// Offers "Add to home screen". Android shows a real install button, iPhone gets the two steps.
export default function InstallPrompt() {
  const [evt, setEvt] = useState(null);
  const [hidden, setHidden] = useState(() => isStandalone() || recentlyHidden());
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || (!evt && !ios)) return null;

  function later() {
    try { localStorage.setItem(HIDE_KEY, String(Date.now())); } catch {}
    setHidden(true);
  }

  async function install() {
    if (!evt) return;
    evt.prompt();
    try { await evt.userChoice; } catch {}
    setEvt(null);
    setHidden(true);
  }

  return (
    <div className="install-bar">
      <img src="/img/icon-192.png" alt="" />
      <div className="install-text">
        <strong>Put GenHub on your phone</strong>
        <span>
          {evt ? "One tap adds it to your home screen. It opens full screen like an app." : "Tap Share, then Add to Home Screen."}
        </span>
      </div>
      {evt && <button className="install-go" onClick={install}>Install</button>}
      <button className="install-x" onClick={later} aria-label="Not now">×</button>
    </div>
  );
}
