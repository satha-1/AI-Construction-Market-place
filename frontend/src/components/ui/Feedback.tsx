import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cx } from "../../lib/format";
import type { Tone } from "../../lib/visuals";
import { Icon, type IconName } from "../Icon";
import { IconTile } from "./Card";

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} width={size} height={size} viewBox="0 0 24 24" fill="none" role="status" aria-label="Loading">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
      <Spinner className="text-accent" />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" className="mb-4 flex items-start gap-2 rounded-ui border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = "box",
  tone = "teal",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: IconName;
  tone?: Tone;
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-6 py-14 text-center">
      <IconTile icon={icon} tone={tone} size="xl" round className="mx-auto" />
      <p className="mt-4 text-base font-bold text-ink">{title}</p>
      {description ? <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

type Toast = { id: number; tone: "success" | "error" | "info"; message: string };
const ToastContext = createContext<{ push: (tone: Toast["tone"], message: string) => void }>({ push: () => undefined });

export function useToast() {
  const { push } = useContext(ToastContext);
  return useMemo(
    () => ({
      success: (m: string) => push("success", m),
      error: (m: string) => push("error", m),
      info: (m: string) => push("info", m),
    }),
    [push],
  );
}

const toastStyle = {
  success: { icon: "checkCircle" as const, cls: "text-emerald-600" },
  error: { icon: "alert" as const, cls: "text-rose-600" },
  info: { icon: "bell" as const, cls: "text-sky-600" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast["tone"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status" className="pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink shadow-lift">
            <Icon name={toastStyle[t.tone].icon} className={cx("mt-0.5 h-4 w-4 shrink-0", toastStyle[t.tone].cls)} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
