export default function HomeLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] grid min-h-[100dvh] place-items-center overflow-hidden bg-slate-50 px-6 text-center dark:bg-slate-950" role="status" aria-live="polite" aria-label="Loading AdventSkool">
      <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-500/10" aria-hidden="true" />
      <div className="relative w-full max-w-xs">
        <p className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Advent<span className="text-blue-600 dark:text-blue-400">Skool</span></p>
        <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Learn, create, grow</p>
        <p className="mt-10 text-sm font-semibold text-slate-800 dark:text-slate-100">Preparing your experience</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-slate-800" aria-hidden="true">
          <span className="home-loading-progress block h-full w-1/3 rounded-full bg-blue-600 dark:bg-blue-400" />
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">A moment while we get things ready</p>
      </div>
    </div>
  );
}
