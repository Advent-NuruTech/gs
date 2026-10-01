type NavigationListener = (pending: boolean) => void;

const NAVIGATION_TIMEOUT_MS = 8000;

const listeners = new Set<NavigationListener>();
let pendingCount = 0;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  const pending = pendingCount > 0;
  listeners.forEach((listener) => listener(pending));
}

export function isNavigationPending(): boolean {
  return pendingCount > 0;
}

export function subscribeNavigation(listener: NavigationListener): () => void {
  listeners.add(listener);
  listener(pendingCount > 0);
  return () => {
    listeners.delete(listener);
  };
}

/** Marks a client navigation as in flight so the top progress bar can show. */
export function startNavigation() {
  pendingCount += 1;
  emit();
  if (safetyTimer) clearTimeout(safetyTimer);
  safetyTimer = setTimeout(() => {
    safetyTimer = null;
    pendingCount = 0;
    emit();
  }, NAVIGATION_TIMEOUT_MS);
}

export function finishNavigation() {
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
  pendingCount = 0;
  emit();
}
