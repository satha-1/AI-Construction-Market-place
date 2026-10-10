import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api, setToken } from "../../api";
import { useAuth } from "../../auth";
import AuthShell from "../../components/AuthShell";
import PasswordField from "../../components/PasswordField";
import { Button, ErrorNote, Input } from "../../components/ui";
import { authPath } from "../../lib/authPaths";
import { homeFor } from "../../roles";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const fromState = (location.state as { from?: string } | null)?.from;
  const from = params.get("from") || fromState || undefined;
  const roleParam = params.get("role") === "vendor" ? "vendor" : params.get("role") === "customer" ? "customer" : undefined;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const token = await api.login({ email, password });
      setToken(token.access_token);
      const me = await api.me();
      setUser(me);
      navigate(from ?? homeFor(me.role), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to request quotations, manage projects, or run your vendor catalog."
      footer={
        <>
          No account?{" "}
          <Link className="font-semibold text-accent hover:underline" to={authPath({ mode: "register", role: roleParam, from })}>
            Create one
          </Link>
          {" · "}
          <Link className="font-semibold text-accent hover:underline" to="/">
            Back to marketplace
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label="Email" type="email" autoComplete="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Enter password" />
        <ErrorNote error={error} />
        <Button type="submit" size="lg" className="w-full" loading={busy} icon="arrowRight">
          {busy ? "Signing in" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
