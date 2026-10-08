import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cx } from "../../lib/format";
import { Spinner } from "./Feedback";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90 border border-transparent",
  secondary: "bg-surface text-ink border border-line hover:border-ink",
  ghost: "bg-transparent text-muted border border-transparent hover:bg-accent-soft hover:text-ink",
  danger: "bg-surface text-danger border border-line hover:border-danger",
};

const sizes: Record<Size, string> = {
  sm: "min-h-[32px] px-3 text-[11px]",
  md: "min-h-[44px] px-4 text-xs",
  lg: "min-h-[48px] px-6 text-sm",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "focus-ring inline-flex select-none items-center justify-center gap-2 rounded-ui font-bold uppercase tracking-wider",
    "transition-all duration-ui ease-ui disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  );
});

type ButtonLinkProps = LinkProps & { variant?: Variant; size?: Size };

export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
