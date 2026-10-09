import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../../lib/format";
import type { Tone } from "../../lib/visuals";
import { Icon, type IconName } from "../Icon";
import { IconTile } from "./Card";

/** Solid, opaque dialog — same surface language as cards (never see-through). */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
  icon = "sliders",
  tone = "teal",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  icon?: IconName;
  tone?: Tone;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        className={cx(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-card border border-line bg-white shadow-lift sm:rounded-card",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start gap-3 border-b border-line bg-white px-6 py-5">
          <IconTile icon={icon} tone={tone} size="md" />
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="modal-title" className="text-base font-bold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-soft hover:text-ink">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto bg-white px-6 py-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-soft px-6 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
