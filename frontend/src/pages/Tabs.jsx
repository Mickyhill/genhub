export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([key, label, badge]) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          className={"tab" + (active === key ? " active" : "")}
          onClick={(e) => { onChange(key); e.currentTarget.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }}
        >
          {label}{badge ? <span className="badge">{badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
