// Small building blocks for the numbered step cards (admin Manage page and class rep Manage tab).
export function StepHead({ n, title, sub, icon }) {
  return (
    <div className="step-head">
      <span className="step-n">{n || icon}</span>
      <div>
        <h3>{title}</h3>
        {sub && <p className="step-sub">{sub}</p>}
      </div>
    </div>
  );
}

export function Empty({ icon, children }) {
  return <div className="empty"><span className="empty-ic">{icon}</span><p>{children}</p></div>;
}
