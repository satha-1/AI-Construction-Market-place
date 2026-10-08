import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AdminOverview, AdminProject, AdminRate, User, api } from "../api";
import { useAuth } from "../auth";

const tabs = ["Overview", "Users", "Projects", "Rates"] as const;
type Tab = (typeof tabs)[number];

const statColors = [
  "from-orange-500 to-amber-400",
  "from-fuchsia-600 to-pink-500",
  "from-teal-500 to-cyan-400",
  "from-indigo-600 to-violet-500",
];

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("Overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [rates, setRates] = useState<AdminRate[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") return;
    Promise.all([api.adminOverview(), api.adminUsers(), api.adminProjects(), api.adminRates()])
      .then(([stats, people, jobs, priceBook]) => {
        setOverview(stats);
        setUsers(people);
        setProjects(jobs);
        setRates(priceBook);
      })
      .catch((err: Error) => setError(err.message));
  }, [user?.role]);

  if (user && user.role !== "admin") return <Navigate to="/projects" replace />;

  async function changeRole(person: User, role: string) {
    setError("");
    setNotice("");
    try {
      const updated = await api.adminUpdateRole(person.id, role);
      setUsers((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setNotice(`${updated.full_name} is now ${updated.role}.`);
      setOverview(await api.adminOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role");
    }
  }

  async function saveRate(event: FormEvent<HTMLFormElement>, rate: AdminRate) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const unitRate = Number(form.get("unit_rate"));
    const currency = String(form.get("currency") || rate.currency);
    setError("");
    setNotice("");
    try {
      const updated = await api.adminUpdateRate(rate.id, { unit_rate: unitRate, currency });
      setRates((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setNotice(`Updated ${updated.item_name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update rate");
    }
  }

  const cards = overview
    ? [
        ["Users", overview.users],
        ["Customers", overview.customers],
        ["Vendors", overview.vendors],
        ["Projects", overview.projects],
        ["Vendor profiles", overview.vendor_profiles],
        ["Open flags", overview.open_flags],
      ]
    : [];

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-fuchsia-600 to-indigo-600 px-6 py-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Marketplace control</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/90">
          Review accounts, every customer project, and the reference rates used by cost estimates.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((name) => (
          <button
            key={name}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === name ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-800">{notice}</p> : null}

      {tab === "Overview" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(([label, value], index) => (
            <div key={String(label)} className={`rounded-2xl bg-gradient-to-br ${statColors[index % statColors.length]} p-5 text-white shadow`}>
              <p className="text-sm text-white/80">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "Users" ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((person) => (
                <tr key={person.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{person.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{person.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-slate-200 px-2 py-1"
                      value={person.role}
                      onChange={(event) => changeRole(person, event.target.value)}
                    >
                      <option value="customer">customer</option>
                      <option value="vendor">vendor</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "Projects" ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={4}>
                    No projects yet.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{project.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {project.owner_name}
                      <span className="block text-xs">{project.owner_email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{project.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{project.location || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "Rates" ? (
        <div className="mt-6 grid gap-4">
          <p className="text-sm text-slate-500">
            These reference rates feed the cost calculator. Changing a rate applies to the next estimate.
          </p>
          {rates.map((rate) => (
            <form
              key={rate.id}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1.4fr_0.8fr_8rem_6rem_auto] sm:items-end"
              onSubmit={(event) => saveRate(event, rate)}
            >
              <div>
                <p className="font-semibold text-slate-900">{rate.item_name}</p>
                <p className="text-xs capitalize text-slate-500">
                  {rate.category} · {rate.unit} · {rate.default_formula}
                </p>
              </div>
              <label className="text-xs font-medium text-slate-500">
                Unit rate
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  name="unit_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={rate.unit_rate}
                  required
                />
              </label>
              <label className="text-xs font-medium text-slate-500">
                Currency
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase"
                  name="currency"
                  defaultValue={rate.currency}
                  maxLength={8}
                  required
                />
              </label>
              <p className="text-xs text-slate-400 sm:pb-2">{rate.effective_date}</p>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Save</button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
