import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Chrome sends the install signal once, soon after the page loads. Catch it here and keep it,
// so the Install button works on whichever screen the student is on.
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__installEvt = e;
  window.dispatchEvent(new Event("genhub-install-ready"));
});
window.addEventListener("appinstalled", () => {
  window.__installEvt = null;
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Lets GenHub install on a phone and open fast. Skipped while developing.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
