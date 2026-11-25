import { officers } from "../data/sampleData";

const stages = ["Tender", "Survey", "Approval", "Installation", "Handover"];

const nameOf = (id) => officers.find((o) => o.id === id)?.name ?? "Unknown";

const daysSince = (dateStr) =>
  Math.floor((new Date() - new Date(dateStr)) / 86400000);

const nextStage = (stage) => stages[stages.indexOf(stage) + 1];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Pipeline({ projects, setProjects }) {
  const moveForward = (id) => {
    setProjects((list) =>
      list.map((p) =>
        p.id === id ? { ...p, stage: nextStage(p.stage), lastUpdate: todayStr() } : p
      )
    );
  };

  return (
    <>
      <h1 className="page-title">Projects pipeline</h1>

      <div className="board">
        {stages.map((stage) => {
          const items = projects.filter((p) => p.stage === stage);

          return (
            <div key={stage} className="column">
              <h3>
                {stage} <span className="muted">({items.length})</span>
              </h3>

              {items.map((p) => {
                const days = daysSince(p.lastUpdate);
                const stuck = days > 21 && stage !== "Handover";

                return (
                  <div key={p.id} className="card project-card">
                    <strong>{p.title}</strong>
                    <div className="muted">₹{p.lakh} L · Officer: {nameOf(p.officerId)}</div>
                    <div className="muted">Last update {days} days ago</div>

                    {stuck && <span className="badge stuck">Stuck</span>}

                    {stage !== "Handover" && (
                      <button className="small-btn" onClick={() => moveForward(p.id)}>
                        Move to {nextStage(stage)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}