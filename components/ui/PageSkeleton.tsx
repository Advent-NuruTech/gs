import { Skeleton, SkeletonCards, SkeletonTable } from "@/components/ui/Skeleton";

interface PageSkeletonProps {
  /** Announced to screen readers, so every loading page says what it is waiting for. */
  label?: string;
  variant?: "cards" | "table" | "form" | "plain";
}

function SkeletonForm() {
  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Page-level loading placeholder. Use while a route's own data is still loading. */
export default function PageSkeleton({ label = "Loading…", variant = "table" }: PageSkeletonProps) {
  return (
    <div className="space-y-5" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {variant === "cards" ? <SkeletonCards /> : null}
      {variant === "table" ? (
        <>
          <SkeletonCards />
          <SkeletonTable />
        </>
      ) : null}
      {variant === "form" ? (
        <>
          <SkeletonCards />
          <SkeletonForm />
          <SkeletonTable />
        </>
      ) : null}
      {variant === "plain" ? <Skeleton className="h-40 w-full" /> : null}
    </div>
  );
}
