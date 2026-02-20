export function formatKsh(amount: number): string {
  const normalized = Number.isFinite(amount) ? amount : 0;
  return `Ksh ${normalized.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
