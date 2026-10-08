import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cx } from "../../lib/format";
import { Icon, type IconName } from "../Icon";
import { Spinner } from "./Feedback";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg border border-transparent shadow-sm hover:brightness-95",
  secondary: "bg-surface text-ink border border-line hover:border-subtle hover:bg-soft",
  soft: "bg-accent-soft text-accent border border-transparent hover:brightness-95",
  ghost: "bg-transparent text-muted border border-transparent hover:bg-soft hover:text-ink",
  danger: "bg-surface text-rose-600 border border-line hover:border-rose-200 hover:bg-rose-50",
};

const sizes: Record<Size, string> = {
  sm: "min-h-[34px] px-3 text-xs gap-1.5",
  md: "min-h-[44px] px-4 text-sm gap-2",
  lg: "min-h-[48px] px-6 text-sm gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "focus-ring inline-flex select-none items-center justify-center whitespace-nowrap rounded-ui font-semibold",
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
  icon?: IconName;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref,
) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Spinner size={14} /> : icon ? <Icon name={icon} className={iconClass} /> : null}
      {children}
    </button>
  );
});

type ButtonLinkProps = LinkProps & { variant?: Variant; size?: Size; icon?: IconName };

export function ButtonLink({ variant = "primary", size = "md", icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </Link>
  );
}
