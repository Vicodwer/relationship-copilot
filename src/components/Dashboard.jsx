import { officers, meetings } from "../data/sampleData";

// Days from today to a date string: negative = past, positive = future
const daysBetween = (dateStr) =>
  (new Date(dateStr) - new Date()) / 86400000;

export default function Dashboard() {
  const thisWeek = meetings.filter((m) => {
    const d = daysBetween(m.date);
    return d >= 0 && d <= 7;
  });

  const followUpsDue = meetings.filter(
    (m) => m.status !== "Cancelled" && daysBetween(m.followUpDate) <= 0
  );

  const notContacted = officers.filter(
    (o) => daysBetween(o.lastMet) < -90
  );

  const cards = [
    { label: "Meetings this week", value: thisWeek.length },
    { label: "Follow-ups due", value: followUpsDue.length },
    { label: "Not contacted in 90 days", value: notContacted.length },
  ];

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <div className="cards">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className="card-label">{c.label}</p>
            <p className="card-value">{c.value}</p>
          </div>
        ))}
      </div>
    </>
  );
}