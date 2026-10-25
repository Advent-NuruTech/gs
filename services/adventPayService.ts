import { apiRequest } from "@/lib/api/client";
import type { AdventPayBillingType, AdventPayCustomer, AdventPayInvoice, AdventPayInvoicePage, AdventPayInvoiceQuery, AdventPayRecurrenceInterval, AdventPaySettings, AdventPaySummary } from "@/types/adventPay";

export const listAdventPayInvoices = async ({ page = 1, pageSize = 25, status = "all", billingType = "all" }: AdventPayInvoiceQuery = {}) => {
  const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status, billingType });
  return apiRequest<AdventPayInvoicePage>(`/api/advent-pay/invoices?${search.toString()}`);
};
export const listAdventPayCustomers = async () => (await apiRequest<{ customers: AdventPayCustomer[] }>("/api/advent-pay/customers")).customers;
export const getAdventPaySettings = () => apiRequest<AdventPaySettings>("/api/advent-pay/settings");
export const saveAdventPaySettings = (data: AdventPaySettings) => apiRequest<AdventPaySettings>("/api/advent-pay/settings", { method: "PUT", body: JSON.stringify(data) });
export const getAdventPaySummary = () => apiRequest<AdventPaySummary>("/api/advent-pay/summary");
export const createAdventPayInvoice = (data: { customerId: string; description: string; amount: number; dueDate: string; paymentMethod: "paystack" | "till"; billingType: AdventPayBillingType; recurrenceInterval?: AdventPayRecurrenceInterval }) => apiRequest<{ invoice: AdventPayInvoice }>("/api/advent-pay/invoices", { method: "POST", body: JSON.stringify(data) });
export const startAdventPayPayment = (id: string) => apiRequest<{ authorizationUrl: string }>(`/api/advent-pay/invoices/${id}/pay`, { method: "POST" });
export const markAdventPayInvoicePaid = (id: string, reference?: string) => apiRequest<{ ok: boolean }>(`/api/advent-pay/invoices/${id}/mark-paid`, { method: "POST", body: JSON.stringify({ reference }) });
export const updateAdventPayInvoice = (id: string, data: Record<string, unknown>) => apiRequest<{ ok: boolean }>(`/api/advent-pay/invoices/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteAdventPayInvoice = (id: string) => apiRequest<{ ok: boolean }>(`/api/advent-pay/invoices/${id}`, { method: "DELETE" });
