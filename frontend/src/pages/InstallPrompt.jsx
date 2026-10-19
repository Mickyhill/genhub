import { useEffect, useState } from "react";

const HIDE_KEY = "genhub_install_hidden";

function isStandalone() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

// "Not now" hides the bar for this visit only. It comes back the next time GenHub opens.
function hiddenThisVisit() {
  try {
    return sessionStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

// Offers "Add to home screen". Android shows a real install button, iPhone gets the two steps.
export default function InstallPrompt() {
  const [evt, setEvt] = useState(() => (typeof window !== "undefined" ? window.__installEvt || null : null));
  const [hidden, setHidden] = useState(() => isStandalone() || hiddenThisVisit());
  const [how, setHow] = useState(false);
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const onReady = () => setEvt(window.__installEvt || null);
    const onInstalled = () => setHidden(true);
    onReady();
    window.addEventListener("genhub-install-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("genhub-install-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden) return null;

  function later() {
    try { sessionStorage.setItem(HIDE_KEY, "1"); } catch {}
    setHidden(true);
  }

  async function install() {
    if (!evt) return;
    evt.prompt();
    let outcome = "";
    try { outcome = (await evt.userChoice).outcome; } catch {}
    window.__installEvt = null;
    setEvt(null);
    if (outcome === "accepted") setHidden(true);
    else setHow(true);
  }

  return (
    <div className="install-bar">
      <img src="/img/icon-192.png" alt="" />
      <div className="install-text">
        <strong>Put GenHub on your phone</strong>
        <span>
          {evt
            ? "One tap adds it to your home screen. It opens full screen like an app."
            : how
              ? ios
                ? "Tap the Share button, then Add to Home Screen."
                : "Tap the three dots at the top right of Chrome. Scroll the menu, then tap Install app or Add to Home screen."
              : "Opens full screen like an app, with the FUTIA crest on your home screen."}
        </span>
      </div>
      {evt ? (
        <button className="install-go" onClick={install}>Install</button>
      ) : (
        !how && <button className="install-go" onClick={() => setHow(true)}>Install</button>
      )}
      <button className="install-x" onClick={later} aria-label="Not now">×</button>
    </div>
  );
}
