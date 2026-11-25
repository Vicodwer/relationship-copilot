import { officers } from "../data/sampleData";

const nameOf = (id) => officers.find((o) => o.id === id)?.name ?? "Unknown";

function Section({ title, children }) {
  return (
    <div className="section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="row">
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function OfficerProfile({ officer: o }) {
  return (
    <div className="profile">
      <h2>{o.name}</h2>
      <p className="muted">{o.cadre} · {o.department} · {o.status}</p>

      <Section title="Details">
        <Row label="Officer ID" value={o.id} />
        <Row label="Batch" value={o.batch} />
        <Row label="Date of birth" value={o.dob} />
        <Row label="Retirement" value={o.retirementDate} />
        <Row label="Field of work" value={o.fieldOfWork} />
        <Row label="Last met" value={o.lastMet} />
      </Section>

      <Section title="Personal projects">
        <ul className="bullets">
          {o.personalProjects.map((p) => (
            <li key={p.name}>{p.name} ({p.year})</li>
          ))}
        </ul>
      </Section>

      <Section title="Company projects">
        <ul className="bullets">
          {o.companyProjects.map((p) => (
            <li key={p.name}>
              {p.name} ({p.year}): {p.outcome}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Reciprocity">
        <span className={`badge ${o.reciprocity.direction.toLowerCase()}`}>
          {o.reciprocity.direction}</span>
        <p className="muted">{o.reciprocity.note}</p>
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