import { InputHTMLAttributes } from "react";

import Field from "@/components/ui/Field";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Visible help text under the label. */
  hint?: string;
  error?: string;
  /** Keep the label for screen readers but hide it visually (e.g. when an external icon-label is rendered). */
  hideLabel?: boolean;
}

const controlClassMap = {
  base: "w-full rounded-md border bg-white px-3 py-2 text-slate-900 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
  valid: "border-slate-300 focus:border-blue-500 focus:ring-blue-500",
  invalid: "border-red-400 focus:border-red-500 focus:ring-red-500",
};

export default function Input({
  label,
  hint,
  error,
  hideLabel = false,
  className = "",
  id,
  disabled,
  ...props
}: InputProps) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} hideLabel={hideLabel}>
      <input
        id={id}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className={`${controlClassMap.base} ${error ? controlClassMap.invalid : controlClassMap.valid} ${className}`}
        {...props}
      />
    </Field>
  );
}
