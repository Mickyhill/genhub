// Phone notifications. Android needs the service worker to show them.
export function canNotify() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function showNotice(title, body, tag) {
  const opts = { body, icon: "/img/icon-192.png", badge: "/img/icon-192.png", tag, data: { url: "/student" } };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) {
      await reg.showNotification(title, opts);
      return true;
    }
  } catch {}
  try {
    new Notification(title, opts);
    return true;
  } catch {}
  return false;
}

const REMIND_KEY = "genhub_remind";
const SEEN_KEY = "genhub_reminded";

export function remindersOn() {
  try {
    return canNotify() && Notification.permission === "granted" && localStorage.getItem(REMIND_KEY) === "1";
  } catch {
    return false;
  }
}

export async function setReminders(on) {
  if (!canNotify()) return "unsupported";
  if (!on) {
    try { localStorage.setItem(REMIND_KEY, "0"); } catch {}
    return "off";
  }
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return "blocked";
  try { localStorage.setItem(REMIND_KEY, "1"); } catch {}
  return "on";
}

export function alreadyReminded(key) {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]").includes(key);
  } catch {
    return false;
  }
}

export function markReminded(key) {
  try {
    const list = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    list.push(key);
    localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-60)));
  } catch {}
}
