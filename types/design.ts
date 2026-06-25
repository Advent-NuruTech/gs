export interface Design {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
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
