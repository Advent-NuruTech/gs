import "server-only";

/**
 * Paystack's Charge API requires an email, even for a phone-authorised
 * mobile-money payment. This address is AdventPay's internal transaction
 * address, not a customer email, so staff do not have to collect one.
 */
export function mobileMoneyTrackingEmail(reference: string) {
  return `mobile-${reference.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@adventskool.co.ke`;
}

export function paystackEmailForMobileMoney(customerEmail: unknown, reference: string) {
  const email = String(customerEmail ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : mobileMoneyTrackingEmail(reference);
}
