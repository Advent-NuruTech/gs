/** What kind of asset backs a design: a flat image or an uploaded PDF template. */
export type DesignFileType = "image" | "pdf";

/** How customers may receive a purchased digital product. */
export type DesignDeliveryMode = "download" | "online_only";

export interface Design {
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
  fileType: DesignFileType;
  /** Total pages for a PDF template — used to calculate the default free preview. */
  pageCount?: number;
  /** Optional number of PDF pages available in the public preview. */
  previewPageCount?: number | null;
  /** Whether the creator permits a file download or reader-only access. */
  deliveryMode: DesignDeliveryMode;
  downloadPrice: number;
  /** Whether customers should see and use the customization option. */
  customizationEnabled: boolean;
  customizationPrice: number;
  published: boolean;
  views: number;
  ordersCount: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDesignInput {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  fileUrl?: string;
  fileType?: DesignFileType;
  pageCount?: number;
  /** Optional number of PDF pages available in the public preview. */
  previewPageCount?: number | null;
  deliveryMode?: DesignDeliveryMode;
  downloadPrice: number;
  customizationEnabled: boolean;
  customizationPrice: number;
  published?: boolean;
  createdBy: string;
}

export interface DesignFilters {
  published?: boolean;
  category?: string;
  pageSize?: number;
}

export const DESIGN_CATEGORIES = [
  "Ebooks",
  "Business Guides",
  "Study Guides",
  "Digital Workbooks",
  "Printable Resources",
  "Professional Templates",
  "YouTube Thumbnails",
  "Event Posters",
  "Church Flyers",
  "Business Flyers",
  "Social Media Banners",
  "Conference Posters",
  "Marketing Graphics",
  "Certificates",
  "Promotional Designs",
] as const;
