import { officers } from "../data/sampleData";

const nameOf = (id) => officers.find((o) => o.id === id)?.name ?? "Unknown";

// Days since a date string (positive = in the past)
const daysSince = (dateStr) =>
  Math.floor((new Date() - new Date(dateStr)) / 86400000);

// Rules that turn officer data into talking points
const talkingPoints = (o, meeting) => {
  const points = [];
  const days = daysSince(o.lastMet);

  if (days > 90) points.push(`Reconnect: last met ${days} days ago`);

  if (o.reciprocity.direction === "Negative") {
    points.push(`Address the open issue: ${o.reciprocity.note}`);
  }
  if (o.reciprocity.direction === "Good") {
    points.push(`Thank them: ${o.reciprocity.note}`);
  }

  o.openPromises.forEach((p) => points.push(`Check progress on: ${p}`));

  o.companyProjects
    .filter((p) => p.outcome === "Under review")
    .forEach((p) => points.push(`Ask for an update on ${p.name}`));

  points.push(`Purpose today: ${meeting.purpose}`);
  return points;
};

function Section({ title, children }) {
  return (
    <div className="section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function MeetingBrief({ meeting }) {
  const o = officers.find((x) => x.id === meeting.officerId);
  if (!o) return null;

  const points = talkingPoints(o, meeting);

  return (
    <div className="profile">
      <h2>Brief: {o.name}</h2>
      <p className="muted">
        {o.cadre} · {o.department} · {meeting.date} · {meeting.place}
      </p>

      <Section title="Relationship">
        <span className={`badge ${o.reciprocity.direction.toLowerCase()}`}>
          {o.reciprocity.direction}
        </span>
        <p className="muted">{o.reciprocity.note}</p>
      </Section>

      <Section title="Talking points">
        <ul className="bullets">
          {points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </Section>

      <Section title="Open promises">
        <ul className="bullets">
          {o.openPromises.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Section>

      <Section title="Connections">
        <ul className="bullets">
          {o.connections.map((id) => (
            <li key={id}>{nameOf(id)}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}