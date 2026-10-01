import PageSkeleton from "@/components/ui/PageSkeleton";

export default function PublicLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <PageSkeleton label="Loading page…" />
    </div>
  );
}
