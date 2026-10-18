// Three moving feature cards shown under the login and register forms.
const ITEMS = [
  { label: "Lecture alarms", img: "/img/f-alarms.webp" },
  { label: "Study files", img: "/img/f-files.webp" },
  { label: "Your results", img: "/img/f-results.webp" },
];

export default function FeatureRow() {
  return (
    <div className="feature-row">
      {ITEMS.map((f) => (
        <div className="feature" key={f.label}>
          <img src={f.img} alt="" loading="lazy" />
          {f.label}
        </div>
      ))}
    </div>
  );
}
