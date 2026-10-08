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
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12s3.5-6.5 8.5-6.5S20.5 12 20.5 12s-3.5 6.5-8.5 6.5S3.5 12 3.5 12Z" />
        <circle cx="12" cy="12" r="2.75" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12s3.5-6.5 8.5-6.5S20.5 12 20.5 12s-3.5 6.5-8.5 6.5S3.5 12 3.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
      <path strokeLinecap="round" d="M4 20 20 4" />
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
    <label className="block text-sm font-medium text-slate-700" htmlFor={inputId}>
      {label}
      <div className="relative mt-1">
        <input
          id={inputId}
          name={name}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 outline-none ring-orange-400 transition focus:bg-white focus:ring-2"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-orange-600"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </label>
  );
}
