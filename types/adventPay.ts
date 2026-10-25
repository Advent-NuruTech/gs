export type AdventPayInvoiceStatus = "pending" | "paid" | "void" | "overdue";
export type AdventPayPaymentMethod = "paystack" | "till";
export type AdventPayBillingType = "one_time" | "recurring";
export type AdventPayRecurrenceInterval = "weekly" | "monthly" | "quarterly" | "yearly";

export interface AdventPayInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  description: string;
  amount: number;
  currency: "KES";
  dueDate: string;
  status: AdventPayInvoiceStatus;
  paymentMethod: AdventPayPaymentMethod;
  tillName?: string;
  tillNumber?: string;
  tillInstructions?: string;
  paystackReference?: string;
  manualPaymentReference?: string;
  paidAt?: string;
  receiptNumber?: string;
  billingType: AdventPayBillingType;
  recurrenceInterval?: AdventPayRecurrenceInterval;
  receiptReceivedFromName: string;
  receiptReceivedFromEmail: string;
  receiptNote?: string;
  publicPaymentLinkEnabled?: boolean;
  createdAt: string;
}

export interface AdventPayPublicInvoice {
  invoiceNumber: string;
  description: string;
  amount: number;
  currency: "KES";
  dueDate: string;
  status: AdventPayInvoiceStatus;
}

export interface AdventPayCustomer {
  id: string;
  name: string;
  email: string;
}

export interface AdventPaySettings {
  tillName: string;
  tillNumber: string;
  tillInstructions: string;
}

export interface AdventPaySummary {
  paidTotal: number;
  outstandingTotal: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  nextDueDate?: string;
  nextScheduledDueDate?: string;
}

export type AdventPayInvoiceFilter = "all" | "paid" | "pending" | "overdue" | "void";

export interface AdventPayInvoicePage {
  invoices: AdventPayInvoice[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdventPayInvoiceQuery {
  page?: number;
  pageSize?: number;
  status?: AdventPayInvoiceFilter;
  billingType?: "all" | AdventPayBillingType;
}
