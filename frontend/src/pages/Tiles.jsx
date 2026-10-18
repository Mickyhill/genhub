// Photo tiles, like category tiles on a marketplace home page.
export default function Tiles({ items }) {
  return (
    <div className="tiles">
      {items.map((t) => (
        <button
          key={t.label}
          type="button"
          className={"tile " + (t.tone || "")}
          style={t.img ? { backgroundImage: `url(${t.img})`, backgroundPosition: t.pos || "center" } : undefined}
          onClick={t.onClick}
        >
          <span className="tile-icon">{t.icon}</span>
          <span className="tile-label">{t.label}</span>
          <span className="tile-sub">{t.sub}</span>
        </button>
      ))}
    </div>
  );
}
