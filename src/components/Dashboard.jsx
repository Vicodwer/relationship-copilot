import { CalendarDays, AlertCircle, Users, Sparkles, FolderKanban, CalendarCheck } from "lucide-react";
import { officers, meetings } from "../data/sampleData";
import DashboardAssistant from "./DashboardAssistant";

// Days from today to a date string: negative = past, positive = future
const daysBetween = (dateStr) => (new Date(dateStr) - new Date()) / 86400000;

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function Dashboard({ onNavigate }) {
  const nameOf = (id) => officers.find((o) => o.id === id)?.name ?? "Unknown";

  const thisWeek = meetings.filter((m) => {
    const d = daysBetween(m.date);
    return d >= 0 && d <= 7;
  });

  const followUpsDue = meetings.filter(
    (m) => m.status !== "Cancelled" && daysBetween(m.followUpDate) <= 0
  );

  const notContacted = officers.filter((o) => daysBetween(o.lastMet) < -90);

  const upcoming = meetings
    .filter((m) => m.status === "Scheduled")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const cards = [
    { label: "Meetings this week", value: thisWeek.length, icon: CalendarDays, tone: "accent" },
    { label: "Follow-ups due", value: followUpsDue.length, icon: AlertCircle, tone: "warn" },
    { label: "Not contacted in 90 days", value: notContacted.length, icon: Users, tone: "bad" },
  ];

  // Only this summary is sent to the AI, not the whole dataset
  const assistantData = {
    today: new Date().toISOString().slice(0, 10),
    upcomingMeetings: upcoming.map((m) => ({
      officer: nameOf(m.officerId),
      date: m.date,
      purpose: m.purpose,
      place: m.place,
    })),
    followUpsDue: followUpsDue.map((m) => ({
      officer: nameOf(m.officerId),
      followUpDate: m.followUpDate,
      purpose: m.purpose,
    })),
    notContactedIn90Days: notContacted.map((o) => o.name),
  };

  return (
    <>
      <section className="hero">
        <p className="hero-date">
          {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })}
        </p>
        <h1 className="hero-title">{greeting()}</h1>
        <p className="hero-sub">Here is what needs your attention today.</p>
      </section>

      <div className="cards">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card stat">
              <span className={`tile-icon tone-${c.tone}`}>
                <Icon size={18} />
              </span>
              <p className="card-label">{c.label}</p>
              <p className="card-value">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="dash-grid">
        <section className="profile">
          <h3 className="panel-title">Upcoming meetings</h3>
          {upcoming.length === 0 ? (
            <p className="muted">No meetings scheduled.</p>
          ) : (
            <ul className="list">
              {upcoming.map((m) => (
                <li key={m.id} className="list-item">
                  <div>
                    <strong>{nameOf(m.officerId)}</strong>
                    <div className="muted">
                      {m.date} · {m.purpose} · {m.place}
                    </div>
                  </div>
                  <span className="badge scheduled">Scheduled</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="profile">
          <h3 className="panel-title">Quick actions</h3>
          <div className="quick">
            <button className="quick-btn" onClick={() => onNavigate("ask")}>
              <Sparkles size={16} /> Ask AI
            </button>
            <button className="quick-btn" onClick={() => onNavigate("meetings")}>
              <CalendarCheck size={16} /> View meetings
            </button>
            <button className="quick-btn" onClick={() => onNavigate("projects")}>
              <FolderKanban size={16} /> Projects pipeline
            </button>
          </div>
        </section>
      </div>

      <DashboardAssistant data={assistantData} />
    </>
  );
}