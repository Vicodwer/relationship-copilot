import { useState } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { API_URL } from "../api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Sign in failed. Please try again.");
        setPassword("");
        return;
      }

      sessionStorage.setItem("token", json.token);
      onLogin();
    } catch {
      setError("We can't reach the server right now. Please try again in a minute.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="login-brand">
          <img src="/logo.png" className="login-logo" alt="" />
          <div>
            <h1>Relationship Copilot</h1>
            <p className="muted">Sign in to continue</p>
          </div>
        </div>

        <label className="field-label" htmlFor="username">Username</label>
        <div className="field">
          <User size={18} className="field-icon" />
          <input
            id="username"
            autoComplete="username"
            autoFocus
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <label className="field-label" htmlFor="password">Password</label>
        <div className="field">
          <Lock size={18} className="field-icon" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="field-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="error-box" role="alert">{error}</p>}

        <button className="login-btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="muted login-foot">Access is limited to authorised users.</p>
      </form>
    </div>
  );
}