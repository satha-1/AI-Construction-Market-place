import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../api";
import { useAuth } from "../auth";
import AuthShell from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import { homeFor } from "../roles";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const token = await api.login({ email, password });
      setToken(token.access_token);
      const me = await api.me();
      setUser(me);
      navigate(homeFor(me.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your customer, vendor, or admin workspace."
      footer={
        <>
          No account?{" "}
          <Link className="font-semibold text-orange-600 hover:text-fuchsia-600" to="/register">
            Create one
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none ring-orange-400 transition focus:bg-white focus:ring-2"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Enter password"
        />
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button
          className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-fuchsia-600 py-2.5 font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-110 disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
