import type { ReactNode } from "react";
import { cx, initials } from "../../lib/format";
import { toneClasses, toneFor, type Tone } from "../../lib/visuals";
import type { IconName } from "../Icon";
import { IconTile } from "./Card";

/** Leading cell with an icon tile (or initials avatar), a title and a subtitle. */
export function EntityCell({ title, subtitle, icon, tone, avatar }: { title: ReactNode; subtitle?: ReactNode; icon?: IconName; tone?: Tone; avatar?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {icon ? (
        <IconTile icon={icon} tone={tone} size="md" round />
      ) : avatar !== undefined ? (
        <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold", toneClasses[tone ?? toneFor(avatar)].tile)}>{initials(avatar)}</span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{title}</p>
        {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-soft/70">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx("px-5 py-3 text-xs font-semibold text-muted", c.align === "right" && "text-right")}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cx("border-b border-line transition-colors duration-ui ease-ui last:border-0 hover:bg-soft/70", onRowClick && "cursor-pointer")}
            >
              {columns.map((c) => (
                <td key={c.key} className={cx("px-5 py-3.5 align-middle text-ink", c.align === "right" && "text-right", c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
