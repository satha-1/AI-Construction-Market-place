import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, setToken } from "../../api";
import { useAuth } from "../../auth";
import AuthShell from "../../components/AuthShell";
import PasswordField from "../../components/PasswordField";
import { Button, ErrorNote, Input } from "../../components/ui";
import { homeFor } from "../../roles";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const token = await api.login({ email, password });
      setToken(token.access_token);
      const me = await api.me();
      setUser(me);
      const from = (location.state as { from?: string } | null)?.from;
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
      subtitle="Sign in to your customer, vendor, or admin workspace."
      footer={
        <>
          No account?{" "}
          <Link className="font-bold text-accent hover:underline" to="/register">
            Create one
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label="Email" type="email" autoComplete="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Enter password" />
        <ErrorNote error={error} />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {busy ? "Signing in" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
