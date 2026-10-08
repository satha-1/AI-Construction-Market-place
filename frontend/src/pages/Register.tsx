import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../api";
import { useAuth } from "../auth";
import AuthShell from "../components/AuthShell";
import { homeFor } from "../roles";

const roles = [
  {
    value: "customer",
    title: "Customer",
    detail: "Create projects, estimates, and RFQs",
  },
  {
    value: "vendor",
    title: "Vendor",
    detail: "Publish a catalog and answer RFQs",
  },
];

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.register({ email, password, full_name: fullName, role });
      const token = await api.login({ email, password });
      setToken(token.access_token);
      const me = await api.me();
      setUser(me);
      navigate(homeFor(me.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join as a customer or a vendor. Admin access is issued separately."
      footer={
        <>
          Already registered?{" "}
          <Link className="font-semibold text-orange-600 hover:text-fuchsia-600" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Full name
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none ring-orange-400 transition focus:bg-white focus:ring-2"
            required
            placeholder="Alex Rivera"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>
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
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none ring-orange-400 transition focus:bg-white focus:ring-2"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">I am a</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {roles.map((option) => {
              const selected = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-transparent bg-gradient-to-br from-orange-500 to-fuchsia-600 text-white shadow-md"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300"
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className={`mt-1 block text-xs ${selected ? "text-white/85" : "text-slate-500"}`}>{option.detail}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button
          className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 py-2.5 font-semibold text-white shadow-lg shadow-teal-500/30 transition hover:brightness-110 disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
