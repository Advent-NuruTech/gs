export type AdventPayInvoiceStatus = "pending" | "paid" | "void" | "overdue";
export type AdventPayPaymentMethod = "paystack" | "till";

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
  createdAt: string;
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
}
