import { useState, useEffect, useRef } from "react";

// A password box with an eye. Tap the eye to see what you typed.
// It hides again by itself after a few seconds, or when you leave the box.
const SHOW_MS = 6000;

export default function PasswordInput({ style, className, onBlur, ...props }) {
  const [shown, setShown] = useState(false);
  const timer = useRef(null);

  function clear() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }
  function hide() { clear(); setShown(false); }
  function toggle() {
    if (shown) { hide(); return; }
    setShown(true);
    clear();
    timer.current = setTimeout(() => setShown(false), SHOW_MS);
  }
  useEffect(() => clear, []);

  return (
    <div className={"pw-wrap" + (className ? " " + className : "")} style={style}>
      <input
        {...props}
        type={shown ? "text" : "password"}
        autoComplete={props.autoComplete || "off"}
        onBlur={(e) => { if (!e.relatedTarget || e.relatedTarget.className !== "pw-eye") hide(); if (onBlur) onBlur(e); }}
      />
      <button
        type="button"
        className="pw-eye"
        onClick={toggle}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        tabIndex={-1}
      >
        {shown ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a19.8 19.8 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a19.7 19.7 0 0 1-3.17 4.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
      </button>
    </div>
  );
}
