import { NavLink } from "react-router-dom";
import { cx } from "../../lib/format";

export type TabItem = { to?: string; id?: string; label: string; badge?: number | string };

const base =
  "focus-ring relative inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap px-4 text-[11px] font-bold uppercase tracking-widest transition-colors duration-ui ease-ui";

/** Route-driven tabs (use for nested pages). */
export function RouteTabs({ items, end }: { items: (TabItem & { to: string })[]; end?: boolean }) {
  return (
    <nav className="-mx-4 flex overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Sections">
      {items.map((item, i) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={end ?? i === 0}
          className={({ isActive }) =>
            cx(base, isActive ? "text-ink after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-accent" : "text-muted hover:text-ink")
          }
        >
          {item.label}
          {item.badge !== undefined && item.badge !== 0 ? (
            <span className="rounded-ui bg-accent px-1.5 py-0.5 text-[9px] text-accent-fg">{item.badge}</span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}

/** State-driven tabs (use for in-page switching). */
export function Tabs({ items, value, onChange }: { items: (TabItem & { id: string })[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="-mx-4 flex overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" role="tablist">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cx(base, active ? "text-ink after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-accent" : "text-muted hover:text-ink")}
          >
            {item.label}
            {item.badge !== undefined && item.badge !== 0 ? (
              <span className="rounded-ui bg-accent px-1.5 py-0.5 text-[9px] text-accent-fg">{item.badge}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
