import { PaymentStatus } from "@/types/payment";

export type WealthOrderStatus = "pending" | "in_progress" | "completed" | "delivered";

/**
 * Two independent purchases with separate billing:
 * - "download": pay the access price, get the full-quality file instantly.
 * - "customization": pay the personalized-request fee only; our team prepares it.
 */
export type WealthOrderKind = "download" | "customization";

/** How the customer wants to open a purchased wealth resource first. */
export type WealthAccessMode = "download" | "read_online";

export interface WealthOrder {
  id: string;
  productId?: string;
  productTitle: string;
  kind: WealthOrderKind;
  accessMode: WealthAccessMode;
  userId?: string;

  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;

  titleText: string;
  subtitle: string;
  instructions: string;
  preferredColors: string;
  preferredStyle: string;

  uploadedImages: string[];

  amount: number;
  currency: string;
  paystackReference: string;
  paymentStatus: PaymentStatus;
  orderStatus: WealthOrderStatus;

  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Customer-supplied order details collected before payment. For a "download"
 * order only the contact fields are needed; the personalization fields apply to
 * "customization" orders.
 */
export interface WealthOrderDraft {
  productId: string;
  kind: WealthOrderKind;
  accessMode?: WealthAccessMode;
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  titleText?: string;
  subtitle?: string;
  instructions?: string;
  preferredColors?: string;
  preferredStyle?: string;
  uploadedImages?: string[];
}
