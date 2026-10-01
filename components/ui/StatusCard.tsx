import { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info, Loader2, X } from "lucide-react";

export type FeedbackKind = "loading" | "success" | "error" | "info" | "warning";

interface StatusCardProps {
  kind: FeedbackKind;
  title: string;
  description?: string;
  /** Extra controls (retry, undo, view details) rendered inside the card. */
  actions?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const kindClassMap: Record<FeedbackKind, string> = {
  loading: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  error: "border-red-300 bg-red-50 text-red-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-slate-300 bg-slate-50 text-slate-800",
};

const iconClassMap: Record<FeedbackKind, string> = {
  loading: "text-blue-600",
  success: "text-emerald-600",
  error: "text-red-600",
  warning: "text-amber-600",
  info: "text-slate-500",
};

const iconMap: Record<FeedbackKind, typeof Info> = {
  loading: Loader2,
  success: CheckCircle2,
  error: AlertTriangle,
  warning: CircleAlert,
  info: Info,
};

/**
 * The single way this app reports pending work, errors, and confirmations.
 * It is deliberately a raised, tinted card so feedback never blends into page content.
 */
export default function StatusCard({
  kind,
  title,
  description,
  actions,
  onDismiss,
  className = "",
}: StatusCardProps) {
  const Icon = iconMap[kind];

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      aria-busy={kind === "loading" || undefined}
      className={`flex items-start gap-3 rounded-xl border-l-4 px-4 py-3 shadow-sm ${kindClassMap[kind]} ${className}`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${iconClassMap[kind]} ${kind === "loading" ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mt-1 text-sm opacity-90">{description}</p> : null}
        {actions ? <div className="mt-2 flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="-m-1 rounded p-1 opacity-70 transition hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
