import { PaymentStatus } from "@/types/payment";

export type DesignOrderStatus = "pending" | "in_progress" | "completed" | "delivered";

/**
 * Two independent purchases with separate billing:
 * - "download": pay the download price, get the full-quality file instantly.
 * - "customization": pay the customization fee only; our team personalises it.
 */
export type DesignOrderKind = "download" | "customization";

export interface DesignOrder {
  id: string;
  designId?: string;
  designTitle: string;
  kind: DesignOrderKind;

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
  orderStatus: DesignOrderStatus;

  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Customer-supplied order details collected before payment. For a "download"
 * order only the contact fields are needed; the customization fields apply to
 * "customization" orders.
 */
export interface DesignOrderDraft {
  designId: string;
  kind: DesignOrderKind;
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
