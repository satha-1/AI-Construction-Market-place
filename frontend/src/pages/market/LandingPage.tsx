import { Link } from "react-router-dom";
import { useAuth } from "../../auth";
import { Icon, type IconName } from "../../components/Icon";
import { ButtonLink, IconTile, type Tone } from "../../components/ui";
import { quoteAuthPath, vendorAuthPath } from "../../lib/authPaths";
import { homeFor } from "../../roles";

const steps: { icon: IconName; tone: Tone; title: string; text: string }[] = [
  { icon: "search", tone: "teal", title: "Browse materials", text: "Explore verified vendor catalogs by category and location." },
  { icon: "user", tone: "blue", title: "Sign in to act", text: "Create a free account when you are ready to order or sell." },
  { icon: "calculator", tone: "violet", title: "Estimate & RFQ", text: "Customers build a BOQ; vendors publish stock and quote." },
  { icon: "award", tone: "amber", title: "Compare & select", text: "Side-by-side quotations with a clear human decision." },
];

const audiences: { icon: IconName; tone: Tone; title: string; text: string; primary: { to: string; label: string }; secondary: { to: string; label: string } }[] = [
  {
    icon: "briefcase",
    tone: "teal",
    title: "For customers",
    text: "Upload drawings, get an AI-assisted BOQ, then request quotes from verified suppliers.",
    primary: { to: quoteAuthPath, label: "Register as customer" },
    secondary: { to: "/marketplace", label: "Browse materials" },
  },
  {
    icon: "store",
    tone: "blue",
    title: "For vendors",
    text: "Publish your catalog, receive RFQs in your inbox, and win work with clear quotations.",
    primary: { to: vendorAuthPath, label: "Register as vendor" },
    secondary: { to: "/login", label: "Vendor sign in" },
  },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <>
      {/* Hero — one composition: brand, headline, support, CTAs */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-br from-accent-soft via-white to-sky-50">
        <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" aria-hidden />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 sm:py-20 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Conapp</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Construction materials marketplace
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Browse verified suppliers in public. Sign in when you want to request quotations or sell from your catalog.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/marketplace" size="lg" icon="box">
                Browse marketplace
              </ButtonLink>
              {user ? (
                <ButtonLink to={homeFor(user.role)} size="lg" variant="secondary" icon="dashboard">
                  Open workspace
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/login" size="lg" variant="secondary" icon="user">
                    Sign in
                  </ButtonLink>
                  <ButtonLink to="/register" size="lg" variant="soft" icon="plus">
                    Create account
                  </ButtonLink>
                </>
              )}
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-4">
            {[
              { icon: "shieldCheck" as const, tone: "emerald" as Tone, label: "Verified vendors" },
              { icon: "calculator" as const, tone: "violet" as Tone, label: "AI estimates" },
              { icon: "inbox" as const, tone: "blue" as Tone, label: "RFQ workflow" },
              { icon: "award" as const, tone: "amber" as Tone, label: "Quote compare" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-start gap-3 rounded-card border border-line bg-white p-5 shadow-card">
                <IconTile icon={s.icon} tone={s.tone} size="lg" round />
                <p className="text-sm font-semibold text-ink">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-ink">How it works</h2>
        <p className="mt-2 max-w-2xl text-muted">Public browsing first. Accounts unlock ordering and selling.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-card border border-line bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <IconTile icon={s.icon} tone={s.tone} round />
                <span className="text-xs font-semibold text-subtle">Step {i + 1}</span>
              </div>
              <p className="mt-4 text-base font-bold text-ink">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-soft">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:grid-cols-2 lg:px-8">
          {audiences.map((a) => (
            <div key={a.title} className="rounded-card border border-line bg-white p-6 shadow-card sm:p-8">
              <IconTile icon={a.icon} tone={a.tone} size="lg" />
              <h3 className="mt-5 text-xl font-bold text-ink">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{a.text}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {user ? (
                  <ButtonLink to={homeFor(user.role)} icon="arrowRight">
                    Go to workspace
                  </ButtonLink>
                ) : (
                  <ButtonLink to={a.primary.to} icon="arrowRight">
                    {a.primary.label}
                  </ButtonLink>
                )}
                <ButtonLink to={a.secondary.to} variant="secondary">
                  {a.secondary.label}
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="overflow-hidden rounded-card bg-gradient-to-br from-accent to-secondary px-6 py-12 text-white sm:px-10">
          <h2 className="text-2xl font-black sm:text-3xl">Ready to source or sell?</h2>
          <p className="mt-3 max-w-xl text-white/90">Browse freely. Sign in only when you order materials or manage a vendor catalog.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/marketplace" className="inline-flex min-h-[48px] items-center gap-2 rounded-ui bg-white px-5 text-sm font-semibold text-teal-700 transition hover:bg-white/90">
              <Icon name="box" className="h-4 w-4" /> Explore materials
            </Link>
            {!user ? (
              <Link to="/login" className="inline-flex min-h-[48px] items-center gap-2 rounded-ui border border-white/40 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
                <Icon name="user" className="h-4 w-4" /> Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
