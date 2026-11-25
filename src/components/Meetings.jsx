import { useState } from "react";
import { officers, meetings } from "../data/sampleData";
import MeetingBrief from "./MeetingBrief";

const filters = ["All", "Scheduled", "Completed", "Cancelled"];

const nameOf = (id) => officers.find((o) => o.id === id)?.name ?? "Unknown";

export default function Meetings() {
  const [filter, setFilter] = useState("All");
  const [hoverId, setHoverId] = useState(null);   // brief previewed while hovering
  const [pinnedId, setPinnedId] = useState(null); // brief kept open by a click

  const visible = meetings
    .filter((m) => filter === "All" || m.status === filter)
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first

  // Hover preview wins; otherwise show the pinned brief
  const activeId = hoverId ?? pinnedId;

  return (
    <>
      <h1 className="page-title">Meetings ({visible.length})</h1>

      <div className="filters">
        {filters.map((f) => (
          <button
            key={f}
            className={`chip ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="list">
        {visible.map((m) => (
          <li
            key={m.id}
            className="meeting-item"
            onMouseEnter={() => setHoverId(m.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            <div
              className={`list-item clickable ${pinnedId === m.id ? "selected" : ""}`}
              onClick={() => setPinnedId(pinnedId === m.id ? null : m.id)}
            >
              <div>
                <strong>{nameOf(m.officerId)}</strong>
                <div className="muted">
                  {m.date} · {m.purpose} · {m.place}
                </div>
              </div>
              <div className="meta">
                <span className="muted">{m.type}</span>
                <span className={`badge ${m.status.toLowerCase()}`}>{m.status}</span>
              </div>
            </div>

            {activeId === m.id && <MeetingBrief meeting={m} />}
          </li>
        ))}
      </ul>
    </>
  );
}