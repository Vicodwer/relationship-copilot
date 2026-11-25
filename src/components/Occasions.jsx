import { useState } from "react";
import { officers } from "../data/sampleData";

const DAY = 86400000;

const startOfToday = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

// Next date with the same month and day as dateStr
const nextYearly = (dateStr) => {
  const today = startOfToday();
  const d = new Date(dateStr);
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return next;
};

const daysFromToday = (date) => Math.round((date - startOfToday()) / DAY);

const nationalDays = [
  { name: "Republic Day", date: "2000-01-26" },
  { name: "Independence Day", date: "2000-08-15" },
  { name: "Gandhi Jayanti", date: "2000-10-02" },
];

// Every upcoming occasion, soonest first
const buildEvents = () => {
  const officerEvents = officers.flatMap((o) => {
    const list = [
      {
        id: `${o.id}-birthday`,
        officerId: o.id,
        type: "Birthday",
        name: o.name,
        date: nextYearly(o.dob),
      },
    ];
    if (o.status === "Serving") {
      list.push({
        id: `${o.id}-retire`,
        officerId: o.id,
        type: "Retirement",
        name: o.name,
        date: new Date(o.retirementDate),
      });
    }
    return list;
  });

  const nationalEvents = nationalDays.map((n) => ({
    id: n.name,
    type: "National day",
    name: n.name,
    date: nextYearly(n.date),
  }));

  return [...officerEvents, ...nationalEvents]
    .map((e) => ({ ...e, days: daysFromToday(e.date) }))
    .filter((e) => e.days >= 0)
    .sort((a, b) => a.days - b.days);
};

export default function Occasions() {
  const [windowDays, setWindowDays] = useState(30);
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const all = buildEvents();
  const events = all.filter((e) => e.days <= windowDays);
  const next = all[0];

  // The assistant writes the draft from the officer's record
  const draftWithAI = async (e) => {
    setOpenId(e.id);
    setLoading(true);
    setDraft("");

    const officer = officers.find((o) => o.id === e.officerId);
    const question =
      e.type === "National day"
        ? `Write a short greeting for colleagues for ${e.name}.`
        : `Write a short ${e.type.toLowerCase()} message for ${e.name}. Personalise it using their record, such as their field of work or a recent project.`;

    try {
      const res = await fetch("http://localhost:3001/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, data: officer ?? {} }),
      });
      const json = await res.json();
      setDraft(json.answer ?? json.error ?? "No draft");
    } catch {
      setDraft("Could not reach the assistant. Is the server running on port 3001?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="page-title">Occasions ({events.length})</h1>

      <div className="filters">
        <button
          className={`chip ${windowDays === 30 ? "active" : ""}`}
          onClick={() => setWindowDays(30)}
        >
          Next 30 days
        </button>
        <button
          className={`chip ${windowDays === 365 ? "active" : ""}`}
          onClick={() => setWindowDays(365)}
        >
          Next 12 months
        </button>
      </div>

      {events.length === 0 && next && (
        <p className="muted">
          Nothing in the next {windowDays} days. Next up: {next.name} ({next.type}) in{" "}
          {next.days} days.
        </p>
      )}

      <ul className="list">
        {events.map((e) => (
          <li key={e.id} className="meeting-item">
            <div className="list-item">
              <div>
                <strong>{e.name}</strong>
                <div className="muted">
                  {e.type} · {e.date.toDateString()} ·{" "}
                  {e.days === 0 ? "Today" : `in ${e.days} days`}
                </div>
              </div>
              <button className="small-btn" onClick={() => draftWithAI(e)}>
                Draft with AI
              </button>
            </div>

            {openId === e.id && (
              <div className="profile">
                <textarea
                  className="draft"
                  value={loading ? "Writing…" : draft}
                  onChange={(ev) => setDraft(ev.target.value)}
                />
                <button
                  className="small-btn"
                  onClick={() => navigator.clipboard.writeText(draft)}
                >
                  Copy
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}