import { useEffect, useState } from "react";
import { officers, meetings } from "../data/sampleData";
import {
  askAssistant,
  loadRooms,
  loadRoomMessages,
  clearRoom,
  loadMemories,
} from "../api";

const daysSince = (dateStr) =>
  Math.floor((new Date() - new Date(dateStr)) / 86400000);

const nameOf = (id) => officers.find((o) => o.id === id)?.name ?? "Unknown";

// Built into Chrome and Edge
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Reads a reply aloud using the browser's built-in voice
const speakText = (text, enabled) => {
  if (!enabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  window.speechSynthesis.speak(u);
};

const newRoomId = () => `general:${Date.now()}`;

const roomTitle = (room) => {
  if (room.startsWith("officer:")) {
    return nameOf(room.slice("officer:".length));
  }
  const when = Number(room.split(":")[1]);
  return `Chat · ${new Date(when).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function AskAI({ projects }) {
  // Every time this screen opens, it starts a new general chat
  const [room, setRoom] = useState(newRoomId);
  const [focus, setFocus] = useState(null); // officer id, when the room is about someone
  const [chat, setChat] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [memories, setMemories] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceReply, setVoiceReply] = useState(true);

  const refreshLists = () => {
    loadRooms().then(setRooms).catch(() => {});
    loadMemories().then(setMemories).catch(() => {});
  };

  useEffect(() => {
    refreshLists();
  }, []);

  // Switch to a room and load its saved messages
  const openRoom = (id, officerId = null) => {
    setRoom(id);
    setFocus(officerId);
    setChat([]);
    loadRoomMessages(id)
      .then((msgs) => setChat(msgs.map((m) => ({ role: m.role, text: m.text, source: m.source }))))
      .catch(() => {});
  };

  const quick = [
    {
      q: "Who haven't I contacted in 90 days?",
      run: () =>
        officers
          .filter((o) => daysSince(o.lastMet) > 90)
          .map((o) => ({ title: o.name, detail: `last met ${daysSince(o.lastMet)} days ago` })),
    },
    {
      q: "Which projects are stuck?",
      run: () =>
        projects
          .filter((p) => p.stage !== "Handover" && daysSince(p.lastUpdate) > 21)
          .map((p) => ({
            title: p.title,
            detail: `${p.stage} · ₹${p.lakh} L · last update ${daysSince(p.lastUpdate)} days ago`,
          })),
    },
    {
      q: "Which meetings are scheduled?",
      run: () =>
        meetings
          .filter((m) => m.status === "Scheduled")
          .map((m) => ({
            title: nameOf(m.officerId),
            detail: `${m.date} · ${m.purpose} · ${m.place}`,
          })),
    },
  ];

  // Quick answers are shown in the chat only, not saved
  const runQuick = (item) => {
    const results = item.run();

    if (results.length === 0) {
      const none = "No matches. Nothing needs attention here.";
      setChat((c) => [...c, { role: "user", text: item.q }, { role: "assistant", text: none }]);
      speakText(none, voiceReply);
      return;
    }

    const lines = results.map((r) => `• ${r.title}: ${r.detail}`);
    const spoken = results.map((r) => `${r.title}, ${r.detail}`).join(". ");

    setChat((c) => [
      ...c,
      { role: "user", text: item.q },
      { role: "assistant", text: lines.join("\n") },
    ]);
    speakText(`${results.length} results. ${spoken}`, voiceReply);
  };

  const buildSnapshot = () => ({
    today: new Date().toISOString().slice(0, 10),
    focus: focus ? officers.find((o) => o.id === focus) : null,
    officers: officers.map((o) => ({
      id: o.id,
      name: o.name,
      department: o.department,
      cadre: o.cadre,
      status: o.status,
      fieldOfWork: o.fieldOfWork,
      lastMet: o.lastMet,
      relation: o.reciprocity.direction,
      relationNote: o.reciprocity.note,
      openPromises: o.openPromises,
      companyProjects: o.companyProjects,
    })),
    meetings: meetings.map((m) => ({
      officerId: m.officerId,
      date: m.date,
      purpose: m.purpose,
      place: m.place,
      status: m.status,
    })),
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      stage: p.stage,
      lakh: p.lakh,
      lastUpdate: p.lastUpdate,
      officerId: p.officerId,
    })),
  });

  const ask = async (question, source = "text") => {
    setChat((c) => [...c, { role: "user", text: question, source }]);
    setText("");
    setLoading(true);

    let reply;
    try {
      reply = await askAssistant(question, buildSnapshot(), source, room);
    } catch (err) {
      reply = `Could not get an answer: ${err.message}`;
    }

    setChat((c) => [...c, { role: "assistant", text: reply, source: "ai" }]);
    speakText(reply, voiceReply);
    setLoading(false);
    refreshLists();
  };

  const submit = (e) => {
    e.preventDefault();
    if (text.trim() && !loading) ask(text.trim(), "text");
  };

  // Speak a request; the transcript is sent straight to the assistant
  const speak = () => {
    if (!Recognition) {
      setChat((c) => [...c, { role: "assistant", text: "Voice input needs Chrome or Edge." }]);
      return;
    }
    const rec = new Recognition();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) => {
      const said = e.results[0][0].transcript.trim();
      if (said) ask(said, "voice");
    };
    rec.start();
  };

  const stopSpeaking = () => window.speechSynthesis?.cancel();

  const clearCurrent = () => {
    clearRoom(room).finally(() => {
      setChat([]);
      refreshLists();
    });
  };

  const title = room.startsWith("officer:") ? roomTitle(room) : "Ask AI";

  return (
    <div className="ask-layout">
      <aside className="room-list">
        <button className="small-btn full" onClick={() => openRoom(newRoomId(), null)}>
          + New chat
        </button>

        <p className="muted label">Officers</p>
        {officers.map((o) => (
          <button
            key={o.id}
            className={`room-item ${room === `officer:${o.id}` ? "active" : ""}`}
            onClick={() => openRoom(`officer:${o.id}`, o.id)}
          >
            <span className="avatar sm">{o.name.charAt(0)}</span>
            <span>
              <strong>{o.name}</strong>
              <span className="muted">{o.department}</span>
            </span>
          </button>
        ))}

        <p className="muted label">Recent chats</p>
        {rooms
          .filter((r) => r.room.startsWith("general:"))
          .map((r) => (
            <button
              key={r.room}
              className={`room-item ${room === r.room ? "active" : ""}`}
              onClick={() => openRoom(r.room, null)}
            >
              <span>
                <strong>{roomTitle(r.room)}</strong>
              </span>
            </button>
          ))}
      </aside>

      <section className="ask-main">
        <div className="ask-header">
          <h1 className="page-title">{title}</h1>
          <div className="voice-controls">
            <button
              className={`chip ${voiceReply ? "active" : ""}`}
              onClick={() => {
                if (voiceReply) stopSpeaking();
                setVoiceReply(!voiceReply);
              }}
            >
              Voice reply: {voiceReply ? "On" : "Off"}
            </button>
            <button className="chip" onClick={stopSpeaking}>Stop</button>
            <button className="chip" onClick={clearCurrent}>Clear chat</button>
          </div>
        </div>

        <div className="chat">
          {chat.length === 0 && (
            <p className="muted">
              {focus
                ? `Start the conversation about ${nameOf(focus)}. Try: "draft a birthday message".`
                : 'Say hi, type a question, or press Speak. Start a message with "remember" to save a fact.'}
            </p>
          )}
          {chat.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.text}
              {m.source === "voice" && <span className="tag">voice</span>}
            </div>
          ))}
          {loading && <div className="bubble assistant muted">Thinking…</div>}
        </div>

        <form className="ask-form" onSubmit={submit}>
          <input
            className="search"
            placeholder={focus ? `Message about ${nameOf(focus)}` : "Type a message or question"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="button" className="chip" onClick={speak} disabled={loading || listening}>
            {listening ? "Listening…" : "Speak"}
          </button>
          <button className="small-btn" disabled={loading}>Send</button>
        </form>

        <p className="muted">Quick questions:</p>
        <div className="filters">
          {quick.map((item) => (
            <button key={item.q} className="chip" onClick={() => runQuick(item)}>
              {item.q}
            </button>
          ))}
        </div>

        {memories.length > 0 && (
          <>
            <p className="muted">Saved memory ({memories.length}):</p>
            <ul className="list">
              {memories.map((m) => (
                <li key={`${m.created_at}-${m.fact}`} className="list-item">
                  <span>{m.fact}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}