import { ReactNode } from "react";

export type BadgeTone = "slate" | "amber" | "emerald" | "red" | "blue";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const toneClassMap: Record<NonNullable<BadgeProps["tone"]>, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  emerald: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  red: "bg-red-100 text-red-700 ring-red-200",
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
};

export default function Badge({ children, tone = "slate", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneClassMap[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
