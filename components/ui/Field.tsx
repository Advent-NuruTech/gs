import { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  /** Visible help text under the label. */
  hint?: string;
  /** Visible validation message under the control. */
  error?: string;
  /** Keep the label for screen readers but hide it visually. */
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}

export default function Field({
  label,
  htmlFor,
  hint,
  error,
  hideLabel = false,
  className = "",
  children,
}: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 text-sm font-medium text-slate-700 ${className}`}>
      <label htmlFor={htmlFor} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </label>
      {hint ? <span className="-mt-0.5 text-xs font-normal text-slate-500">{hint}</span> : null}
      {children}
      {error ? (
        <span role="alert" className="text-xs font-medium text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
