// src/components/Transcripts.jsx
import { useEffect, useState } from "react";
import { officers } from "../data/sampleData";
import { listTranscripts, saveTranscript, analyzeTranscript, deleteTranscript } from "../transcriptApi";

const today = () => new Date().toISOString().slice(0, 10);

export default function Transcripts() {
  const [officerId, setOfficerId] = useState(String(officers[0]?.id ?? ""));
  const [meetingDate, setMeetingDate] = useState(today());
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  const officer = officers.find((o) => String(o.id) === officerId);
  const selected = items.find((t) => t.id === selectedId) ?? null;

  async function load() {
    try {
      setItems(await listTranscripts(officerId));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    setSelectedId(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officerId]);

  function dictate() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Voice input needs Chrome or Edge.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (e) => setText((t) => (t ? t + " " : "") + e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }

  async function save() {
    if (!text.trim()) return setError("Type or dictate the meeting notes first.");
    setBusy("save");
    setError("");
    try {
      const row = await saveTranscript({
        officerId,
        officerName: officer?.name ?? "",
        meetingDate,
        title: title || `Meeting with ${officer?.name ?? "officer"}`,
        transcript: text.trim(),
      });
      setText("");
      setTitle("");
      await load();
      setSelectedId(row.id);
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  }

  async function analyze(id) {
    setBusy("analyze");
    setError("");
    try {
      const row = await analyzeTranscript(id);
      setItems((list) => list.map((t) => (t.id === id ? row : t)));
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  }

  async function remove(id) {
    try {
      await deleteTranscript(id);
      setSelectedId(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="transcripts">
      <h2>Meeting notes</h2>
      <p className="muted">
        Record what was discussed. Save it here, then the assistant pulls out the summary, decisions,
        promises and what to prepare next time.
      </p>
      {error && <div className="error-box">{error}</div>}

      <div className="tr-grid">
        <section className="tr-card">
          <label>
            Officer
            <select value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
              {officers.map((o) => (
                <option key={o.id} value={String(o.id)}>{o.name}</option>
              ))}
            </select>
          </label>
          <div className="tr-row">
            <label>
              Date
              <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </label>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CCTV tender review" />
            </label>
          </div>
          <label>
            Notes / transcript
            <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Type or dictate what was discussed..." />
          </label>
          <div className="tr-row">
            <button className="btn-ghost" onClick={dictate} disabled={listening}>
              {listening ? "Listening..." : "Dictate"}
            </button>
            <button className="btn-primary" onClick={save} disabled={busy === "save"}>
              {busy === "save" ? "Saving..." : "Save meeting"}
            </button>
          </div>
        </section>

        <section className="tr-card">
          <h3>Saved for {officer?.name ?? "this officer"}</h3>
          {items.length === 0 && <p className="muted">No meetings saved yet.</p>}
          <ul className="tr-list">
            {items.map((t) => (
              <li key={t.id}>
                <button className={`tr-item ${t.id === selectedId ? "active" : ""}`} onClick={() => setSelectedId(t.id)}>
                  <strong>{t.title}</strong>
                  <span className="muted">{t.meetingDate}{t.intelligence ? " · analysed" : ""}</span>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="tr-detail">
              <p className="tr-text">{selected.transcript}</p>
              {!selected.intelligence && (
                <button className="btn-primary" onClick={() => analyze(selected.id)} disabled={busy === "analyze"}>
                  {busy === "analyze" ? "Analysing..." : "Analyse with AI"}
                </button>
              )}
              {selected.intelligence && <Intel data={selected.intelligence} />}
              <button className="btn-ghost small" onClick={() => remove(selected.id)}>Delete</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Block({ label, list }) {
  if (!list?.length) return null;
  return (
    <div className="tr-block">
      <h4>{label}</h4>
      <ul>{list.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

function Intel({ data }) {
  return (
    <div className="tr-intel">
      <h4>Summary</h4>
      <p>{data.summary}</p>
      <Block label="Decisions" list={data.decisions} />
      <Block label="Action items" list={data.actionItems} />
      <Block label="Promises made" list={data.promisesMade} />
      <Block label="Risks / concerns" list={data.risks} />
      {data.nextMeetingBrief && (
        <>
          <h4>Prepare for next meeting</h4>
          <p>{data.nextMeetingBrief}</p>
        </>
      )}
    </div>
  );
}