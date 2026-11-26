import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FolderKanban,
  Gift,
  Sparkles,
  LogOut,
  FileText,
  ListChecks,
} from "lucide-react";
import { projects as initialProjects } from "./data/sampleData";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Officers from "./components/Officers";
import Meetings from "./components/Meetings";
import Pipeline from "./components/Pipeline";
import Occasions from "./components/Occasions";
import AskAI from "./components/AskAI";
import Transcripts from "./components/Transcripts";
import Plan from "./components/Plan";

const screens = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, Component: Dashboard },
  { id: "officers", label: "Officers", icon: Users, Component: Officers },
  { id: "meetings", label: "Meetings", icon: CalendarCheck, Component: Meetings },
  { id: "notes", label: "Meeting Notes", icon: FileText, Component: Transcripts },
  { id: "plan", label: "Weekly Plan", icon: ListChecks, Component: Plan },
  { id: "projects", label: "Projects", icon: FolderKanban, Component: Pipeline },
  { id: "occasions", label: "Occasions", icon: Gift, Component: Occasions },
  { id: "ask", label: "Ask AI", icon: Sparkles, Component: AskAI },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
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
        <div className="brand">
          <img src="/logo.png" className="brand-logo" alt="" />
          Relationship Copilot
        </div>

        {screens.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              className={`nav-btn ${screen === s.id ? "active" : ""}`}
              onClick={() => setScreen(s.id)}
            >
              <Icon size={18} />
              {s.label}
            </button>
          );
        })}

        <div className="sidebar-foot">
          <span className="avatar">R</span>
          <span className="foot-text">Signed in</span>
          <button className="icon-btn" onClick={logout} title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="content">
        <Current
          projects={projects}
          setProjects={setProjects}
          chat={chat}
          setChat={setChat}
          onNavigate={setScreen}
        />
      </main>
    </div>
  );
}