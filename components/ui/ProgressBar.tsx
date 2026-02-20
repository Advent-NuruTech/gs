interface ProgressBarProps {
  value: number;
}

export default function ProgressBar({ value }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-600">{safeValue}% complete</p>
    </div>
  );
}
