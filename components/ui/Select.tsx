import { SelectHTMLAttributes } from "react";

import Field from "@/components/ui/Field";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  /** Visible help text under the label. */
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export default function Select({
  label,
  hint,
  error,
  hideLabel = false,
  className = "",
  id,
  disabled,
  placeholder,
  options,
  children,
  ...props
}: SelectProps) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} hideLabel={hideLabel}>
      <select
        id={id}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className={`w-full appearance-none rounded-md border bg-white px-3 py-2 text-slate-900 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"} ${className}`}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    </Field>
  );
}
