import { apiRequest } from "@/lib/api/client";
import type { AdventPayCustomer, AdventPayInvoice, AdventPaySettings, AdventPaySummary } from "@/types/adventPay";

export const listAdventPayInvoices = async () => (await apiRequest<{ invoices: AdventPayInvoice[] }>("/api/advent-pay/invoices")).invoices;
export const listAdventPayCustomers = async () => (await apiRequest<{ customers: AdventPayCustomer[] }>("/api/advent-pay/customers")).customers;
export const getAdventPaySettings = () => apiRequest<AdventPaySettings>("/api/advent-pay/settings");
export const saveAdventPaySettings = (data: AdventPaySettings) => apiRequest<AdventPaySettings>("/api/advent-pay/settings", { method: "PUT", body: JSON.stringify(data) });
export const getAdventPaySummary = () => apiRequest<AdventPaySummary>("/api/advent-pay/summary");
export const createAdventPayInvoice = (data: { customerId: string; description: string; amount: number; dueDate: string; paymentMethod: "paystack" | "till" }) => apiRequest<{ invoice: AdventPayInvoice }>("/api/advent-pay/invoices", { method: "POST", body: JSON.stringify(data) });
export const startAdventPayPayment = (id: string) => apiRequest<{ authorizationUrl: string }>(`/api/advent-pay/invoices/${id}/pay`, { method: "POST" });
export const markAdventPayInvoicePaid = (id: string, reference?: string) => apiRequest<{ ok: boolean }>(`/api/advent-pay/invoices/${id}/mark-paid`, { method: "POST", body: JSON.stringify({ reference }) });
