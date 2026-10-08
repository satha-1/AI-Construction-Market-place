import { useId, useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  name?: string;
};

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12s3.5-6.5 8.5-6.5S20.5 12 20.5 12s-3.5 6.5-8.5 6.5S3.5 12 3.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
      {open ? null : <path strokeLinecap="round" d="M4 20 20 4" />}
    </svg>
  );
}

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder = "Password",
  autoComplete = "current-password",
  required = true,
  name,
}: Props) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          className="min-h-[44px] w-full rounded-ui border border-line bg-surface px-3.5 pr-11 text-sm text-ink placeholder:text-subtle shadow-card transition-colors duration-ui ease-ui hover:border-subtle focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition-colors hover:text-accent"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </div>
  );
}
