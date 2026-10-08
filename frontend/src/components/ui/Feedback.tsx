import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cx } from "../../lib/format";
import { GeoPattern } from "./Card";

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cx("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <Spinner />
      <span className="label-caps">{label}</span>
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" className="rounded-ui border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger">
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  pattern = "grid",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  pattern?: "grid" | "circles" | "diagonal" | "blocks" | "arcs";
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-dashed border-line bg-surface px-6 py-14 text-center">
      <GeoPattern variant={pattern} className="absolute inset-0 h-full w-full text-subtle opacity-40" />
      <div className="relative">
        <p className="text-sm font-bold text-ink">{title}</p>
        {description ? <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">{description}</p> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast["tone"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const tones = { success: "border-l-success", error: "border-l-danger", info: "border-l-info" };
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx(
              "pointer-events-auto rounded-ui border border-line border-l-4 bg-surface px-4 py-3 text-xs font-medium text-ink shadow-lift",
              tones[t.tone],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
