import { useState } from "react";
import { getPlan } from "../transcriptApi";

export default function Plan() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      setData(await getPlan());
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  const p = data?.plan;

  return (
    <div className="transcripts">
      <h2>Weekly plan</h2>
      <p className="muted">
        Built from every analysed meeting: open actions, promises and risks, ranked by what needs attention first.
      </p>
      {error && <div className="error-box">{error}</div>}
      <button className="btn-primary" onClick={generate} disabled={busy}>
        {busy ? "Planning..." : "Generate plan"}
      </button>
      {data && !p && <p className="muted">{data.message}</p>}
      {p && (
        <div className="tr-grid" style={{ marginTop: 16 }}>
          <section className="tr-card">
            <h3>Priorities</h3>
            <p>{p.weekSummary}</p>
            <ol>
              {(p.priorities || []).map((x, i) => (
                <li key={i}>
                  <strong>{x.officer}:</strong> {x.action}
                  {x.dueBy ? ` (by ${x.dueBy})` : ""}
                  <br />
                  <span className="muted">{x.why}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="tr-card">
            <h3>Follow-ups</h3>
            <ul>{(p.followUps || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
            <h3>Risks to watch</h3>
            <ul>{(p.risksToWatch || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
        </div>
      )}
    </div>
  );
}