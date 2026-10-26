import { ButtonHTMLAttributes, ReactNode } from "react";

import Spinner from "@/components/ui/Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  /** Shows a spinner, blocks repeat clicks, and announces busy state to assistive tech. */
  loading?: boolean;
  /** Label shown while `loading` is true. Defaults to the current children. */
  loadingText?: string;
}

const variantClassMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-blue-600 text-white hover:bg-blue-700",
  danger: "bg-blue-600 text-white hover:bg-blue-700",
};

const sizeClassMap: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export default function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClassMap[variant]} ${sizeClassMap[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}
