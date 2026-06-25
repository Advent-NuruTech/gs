/** What kind of asset backs a design: a flat image or an uploaded PDF template. */
export type DesignFileType = "image" | "pdf";

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
  downloadPrice: number;
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
  downloadPrice: number;
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
