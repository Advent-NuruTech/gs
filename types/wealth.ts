/** What kind of asset backs a wealth resource: a flat image or an uploaded PDF. */
export type WealthProductFileType = "image" | "pdf";

export interface WealthProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  /** The original deliverable served on download (PDF or full-quality image). */
  fileUrl?: string;
  /** "image" (default) or "pdf" — drives badges and download delivery. */
  fileType: WealthProductFileType;
  /** Total pages for a PDF resource — drives the free quarter-of-pages preview. */
  pageCount?: number;
  downloadPrice: number;
  /** Whether customers should see and use the personalized-request option. */
  customizationEnabled: boolean;
  customizationPrice: number;
  published: boolean;
  views: number;
  ordersCount: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWealthProductInput {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  fileUrl?: string;
  fileType?: WealthProductFileType;
  pageCount?: number;
  downloadPrice: number;
  customizationEnabled: boolean;
  customizationPrice: number;
  published?: boolean;
  createdBy: string;
}

export interface WealthProductFilters {
  published?: boolean;
  category?: string;
  pageSize?: number;
}

export const WEALTH_CATEGORIES = [
  "Wealth Foundations",
  "Money Mindset",
  "Budgeting & Saving",
  "Debt Freedom",
  "Investing Basics",
  "Wealth Generation",
  "Wealth Preservation",
  "Family Wealth & Legacy",
  "Estate & Inheritance Planning",
  "Eradicating Generational Poverty",
  "Financial Literacy for Kids",
  "Business & Entrepreneurship",
  "Real Estate",
  "Retirement Planning",
  "Faith & Stewardship",
] as const;
