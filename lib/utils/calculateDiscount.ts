export function calculateDiscount(
  originalPrice: number,
  discountedPrice: number,
): number {
  const parsedOriginal = Number.isFinite(originalPrice) ? originalPrice : 0;
  const parsedDiscount = Number.isFinite(discountedPrice) ? discountedPrice : 0;
  return Math.max(0, parsedOriginal - parsedDiscount);
}
