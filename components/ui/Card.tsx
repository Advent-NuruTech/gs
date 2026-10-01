import { ButtonHTMLAttributes, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Plain white surface used for grouped content. Feedback belongs in StatusCard, not here. */
export function Card({ children, className = "" }: CardProps) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, actions, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 ${className}`}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = "" }: CardProps) {
  return <div className={`px-4 py-4 sm:px-5 ${className}`}>{children}</div>;
}
