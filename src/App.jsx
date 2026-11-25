import { useState } from "react";
import { projects as initialProjects } from "./data/sampleData";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Officers from "./components/Officers";
import Meetings from "./components/Meetings";
import Pipeline from "./components/Pipeline";
import Occasions from "./components/Occasions";
import AskAI from "./components/AskAI";

const screens = [
  { id: "dashboard", label: "Dashboard", Component: Dashboard },
  { id: "officers", label: "Officers", Component: Officers },
  { id: "meetings", label: "Meetings", Component: Meetings },
  { id: "projects", label: "Projects", Component: Pipeline },
  { id: "occasions", label: "Occasions", Component: Occasions },
  { id: "ask", label: "Ask AI", Component: AskAI },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!sessionStorage.getItem("token"));
  const [screen, setScreen] = useState("dashboard");
  const [projects, setProjects] = useState(initialProjects);
  const [chat, setChat] = useState([]);

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  const Current = screens.find((s) => s.id === screen).Component;

  const logout = () => {
    sessionStorage.removeItem("token");
    setLoggedIn(false);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Relationship Copilot</div>
        {screens.map((s) => (
          <button
            key={s.id}
            className={`nav-btn ${screen === s.id ? "active" : ""}`}
            onClick={() => setScreen(s.id)}
          >
            {s.label}
          </button>
        ))}
        <button className="nav-btn" onClick={logout}>Log out</button>
      </aside>

      <main className="content">
        <Current projects={projects} setProjects={setProjects} chat={chat} setChat={setChat} />
      </main>
    </div>
  );
}