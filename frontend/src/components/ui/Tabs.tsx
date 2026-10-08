import { NavLink } from "react-router-dom";
import { cx } from "../../lib/format";
import { Icon, type IconName } from "../Icon";

export type TabItem = { to?: string; id?: string; label: string; badge?: number | string; icon?: IconName };

const base =
  "focus-ring inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-ui px-3.5 text-sm font-medium transition-all duration-ui ease-ui";
const activeCls = "bg-surface text-ink shadow-card ring-1 ring-line";
const idleCls = "text-muted hover:text-ink";

function Count({ value }: { value?: number | string }) {
  if (value === undefined || value === 0) return null;
  return <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{value}</span>;
}

/** Route-driven segmented tabs (use for nested pages). */
export function RouteTabs({ items, end }: { items: (TabItem & { to: string })[]; end?: boolean }) {
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-card bg-soft p-1 ring-1 ring-line" aria-label="Sections">
      {items.map((item, i) => (
        <NavLink key={item.to} to={item.to} end={end ?? i === 0} className={({ isActive }) => cx(base, isActive ? activeCls : idleCls)}>
          {({ isActive }) => (
            <>
              {item.icon ? <Icon name={item.icon} className={cx("h-4 w-4", isActive ? "text-accent" : "")} /> : null}
              {item.label}
              <Count value={item.badge} />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** State-driven segmented tabs (use for in-page switching). */
export function Tabs({ items, value, onChange }: { items: (TabItem & { id: string })[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-card bg-soft p-1 ring-1 ring-line" role="tablist">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => onChange(item.id)} className={cx(base, active ? activeCls : idleCls)}>
            {item.icon ? <Icon name={item.icon} className={cx("h-4 w-4", active ? "text-accent" : "")} /> : null}
            {item.label}
            <Count value={item.badge} />
          </button>
        );
      })}
    </div>
  );
}
