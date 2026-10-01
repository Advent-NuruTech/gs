import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "positive" | "warning";
}

const toneClassMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-900",
  positive: "text-emerald-700",
  warning: "text-amber-700",
};

const toneHintMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-500",
  positive: "text-emerald-600",
  warning: "text-amber-600",
};

export default function StatCard({ label, value, hint, icon, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </div>
      <p className={`mt-2 text-xl font-semibold tabular-nums ${toneClassMap[tone]}`}>{value}</p>
      {hint ? <p className={`mt-1 text-xs ${toneHintMap[tone]}`}>{hint}</p> : null}
    </div>
  );
}
