import { useState } from "react";
import { Mic, Send, Volume2 } from "lucide-react";
import { askAssistant } from "../api";
import { getPlan, listTranscripts } from "../transcriptApi";

const QUICK = [
  "What meetings are coming up?",
  "Which follow-ups are due?",
  "Who have we not contacted in 90 days?",
];

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  window.speechSynthesis.speak(u);
}

export default function DashboardAssistant({ data }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  async function ask(text, source = "text") {
    const q = text.trim();
    if (!q) return;
    setQuestion("");
    setBusy(true);
    setError("");
    try {
      const notes = await listTranscripts().catch(() => []);
const meetingNotes = notes
  .filter((n) => n.intelligence)
  .slice(0, 20)
  .map((n) => ({
    officer: n.officerName,
    date: n.meetingDate,
    title: n.title,
    summary: n.intelligence.summary,
    actionItems: n.intelligence.actionItems,
    promisesMade: n.intelligence.promisesMade,
    risks: n.intelligence.risks,
    nextMeetingBrief: n.intelligence.nextMeetingBrief,
  }));
const res = await askAssistant(q, { ...data, meetingNotes }, source, "dashboard");
      const reply = typeof res === "string" ? res : res.answer;
      setAnswer(reply);
      if (source === "voice") speak(reply);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Voice needs Chrome or Edge.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (e) => ask(e.results[0][0].transcript, "voice");
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }

  return (
    <section className="assistant">
      <h3 className="panel-title">Ask the copilot</h3>

      <form
        className="assistant-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about meetings, follow-ups or officers..."
          maxLength={1000}
        />
        <button type="button" className="icon-btn" onClick={listen} disabled={listening} title="Speak">
          <Mic size={18} />
        </button>
        <button type="submit" className="icon-btn" disabled={busy || !question.trim()} title="Send">
          <Send size={18} />
        </button>
      </form>

      <div className="assistant-chips">
        {QUICK.map((q) => (
          <button key={q} className="chip" onClick={() => ask(q)} disabled={busy}>
            {q}
          </button>
        ))}
      </div>

      {listening && <p className="muted">Listening...</p>}
      {busy && <p className="muted">Thinking...</p>}
      {error && <div className="error-box">{error}</div>}

      {answer && (
        <div className="assistant-answer">
          <p>{answer}</p>
          <button className="icon-btn" onClick={() => speak(answer)} title="Read aloud">
            <Volume2 size={16} />
          </button>
        </div>
      )}
    </section>
  );
}