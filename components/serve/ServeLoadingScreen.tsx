export default function ServeLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] grid min-h-[100dvh] place-items-center overflow-hidden bg-[#06182b] px-6 text-center text-white"
      role="status"
      aria-live="polite"
      aria-label="Loading SERVE* If Saved"
    >
      <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-[#0788dc]/20 blur-3xl" aria-hidden="true" />
      <div className="relative w-full max-w-xs">
        <p className="text-4xl font-black tracking-tight text-[#a5ff00] sm:text-5xl">
          SERVE*
        </p>
        <p className="mt-1 text-sm font-bold text-white">If Saved</p>
        <p className="mt-3 text-sm font-semibold text-white/70">
          Study the Word. Live the Word. Serve the Word
        </p>
        <p className="mt-10 text-sm font-semibold text-white">Preparing your journey</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <span className="home-loading-progress block h-full w-1/3 rounded-full bg-[#a5ff00]" />
        </div>
        <p className="mt-4 text-xs text-white/55">A moment while we get things ready</p>
      </div>
    </div>
  );
}
