import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Keep the label for screen readers but hide it visually (e.g. when an external icon-label is rendered). */
  hideLabel?: boolean;
}

export default function Input({ label, error, hideLabel = false, className = "", ...props }: InputProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <input
        className={`w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2 ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
