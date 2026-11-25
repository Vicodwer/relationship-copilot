import { useState } from "react";
import { API_URL } from "../api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Login failed");
        return;
      }
      sessionStorage.setItem("token", json.token);
      onLogin();
    } catch {
      setError("Cannot reach the server. Is it running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="profile login-card" onSubmit={submit}>
        <h1 className="page-title">Relationship Copilot</h1>
        <input
          className="search"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="search"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button className="small-btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}