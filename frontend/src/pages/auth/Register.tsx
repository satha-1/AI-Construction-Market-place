import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../../api";
import { useAuth } from "../../auth";
import AuthShell from "../../components/AuthShell";
import PasswordField from "../../components/PasswordField";
import { Button, ErrorNote, IconTile, Input } from "../../components/ui";
import { cx } from "../../lib/format";
import { passwordsMatch, validatePassword } from "../../password";
import { homeFor } from "../../roles";

const roles = [
  { value: "customer", title: "Customer", detail: "Create projects, estimates, and RFQs", icon: "briefcase" as const, tone: "teal" as const },
  { value: "vendor", title: "Vendor", detail: "Publish a catalog and answer RFQs", icon: "store" as const, tone: "blue" as const },
];

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const invalid = validatePassword(password) || passwordsMatch(password, confirmPassword);
    if (invalid) {
      setError(new Error(invalid));
      return;
    }
    setBusy(true);
    try {
      await api.register({ email, password, full_name: fullName, role });
      const token = await api.login({ email, password });
      setToken(token.access_token);
      const me = await api.me();
      setUser(me);
      navigate(homeFor(me.role), { replace: true });
    } catch (err) {
      setError(err);
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
          <Link className="font-bold text-accent hover:underline" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label="Full name" required placeholder="Alex Rivera" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Email" type="email" autoComplete="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label="Password" value={password} onChange={(v) => { setPassword(v); setError(null); }} autoComplete="new-password" placeholder="Enter password" />
        <PasswordField label="Confirm password" value={confirmPassword} onChange={(v) => { setConfirmPassword(v); setError(null); }} autoComplete="new-password" placeholder="Enter password" />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">I am a</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((option) => {
              const selected = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRole(option.value)}
                  className={cx(
                    "focus-ring flex min-h-[44px] items-start gap-3 rounded-card border px-4 py-3 text-left transition-all duration-ui ease-ui",
                    selected ? "border-accent bg-accent-soft ring-4 ring-accent/10" : "border-line bg-surface hover:border-subtle",
                  )}
                >
                  <IconTile icon={option.icon} tone={option.tone} size="md" round />
                  <span>
                    <span className="block text-sm font-bold text-ink">{option.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">{option.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <ErrorNote error={error} />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {busy ? "Creating account" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
