import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/img/s2.jpg", pos: "center", caption: "Your campus, your timetable" },
  { src: "/img/s4.jpg", pos: "center", caption: "Study files for every course" },
  { src: "/img/s3.jpg", pos: "70% center", caption: "Innovation Drives Transformation" },
];

// A hero banner with FUTIA photos that fade into each other.
// Tap or click the dots to jump. Hover pauses. Respects reduced motion.
export default function HeroSlides({ children, className = "" }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div
      className={"hero " + className}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-slides" aria-hidden="true">
        {SLIDES.map((s, n) => (
          <div
            key={s.src}
            className={"hero-slide" + (n === i ? " on" : "")}
            style={{ backgroundImage: `url(${s.src})`, backgroundPosition: s.pos }}
          />
        ))}
      </div>
      <div className="hero-inner">
        {children}
        <div className="hero-dots">
          {SLIDES.map((s, n) => (
            <button
              key={s.src}
              type="button"
              className={"dot" + (n === i ? " on" : "")}
              aria-label={s.caption}
              onClick={() => setI(n)}
            />
          ))}
          <span className="hero-caption">{SLIDES[i].caption}</span>
        </div>
      </div>
    </div>
  );
}
