// Photo tiles, like category tiles on a marketplace home page.
export default function Tiles({ items }) {
  const pics = items.length > 0 && items.every((t) => t.pic);
  return (
    <div className={"tiles" + (pics ? " pics" : "")}>
      {items.map((t) => t.pic ? (
        <button key={t.label} type="button" className="tile-pic" onClick={t.onClick} aria-label={`${t.label}. ${t.sub || ""}`}>
          <img src={t.pic} alt="" loading="lazy" />
        </button>
      ) : (
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
