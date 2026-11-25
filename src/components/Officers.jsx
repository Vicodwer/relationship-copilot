import { useState } from "react";
import { officers } from "../data/sampleData";
import OfficerProfile from "./OfficerProfile";

const normalize = (text) => text.toLowerCase().replace(/[^a-z]/g, "");

export default function Officers() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const visible = officers.filter((o) =>
    normalize(o.name).includes(normalize(search))
  );

  const selected = officers.find((o) => o.id === selectedId);

  return (
    <>
      <h1 className="page-title">Officers ({visible.length})</h1>

      <input
        className="search"
        placeholder="Search by name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="split">
        <ul className="list">
          {visible.map((o) => (
            <li
              key={o.id}
              className={`list-item clickable ${o.id === selectedId ? "selected" : ""}`}
              onClick={() => setSelectedId(o.id)}
            >
              <div>
                <strong>{o.name}</strong>
                <div className="muted">{o.department} · {o.cadre}</div>
              </div>
              <span className={`badge ${o.status === "Serving" ? "serving" : "retired"}`}>
                {o.status}
              </span>
            </li>
          ))}
        </ul>

        {selected ? (
          <OfficerProfile officer={selected} />
        ) : (
          <p className="muted">Click an officer to see their profile.</p>
        )}
      </div>
    </>
  );
}