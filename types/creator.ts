export type CreatorSocialPlatform =
  | "website"
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "x"
  | "tiktok";

export type CreatorSocialLinks = Partial<Record<CreatorSocialPlatform, string>>;

export interface CreatorStorefrontProfile {
  id: string;
  name: string;
  handle: string;
  photoUrl?: string;
  bio?: string;
  socialLinks: CreatorSocialLinks;
}

export type StorefrontProductKind = "course" | "design" | "wealth";

export interface StorefrontProduct {
  id: string;
  kind: StorefrontProductKind;
  creatorId: string;
  creatorHandle?: string;
  title: string;
  category: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  views: number;
  ordersCount: number;
  createdAt?: string;
}

export type CreatorDomainStatus =
  | "pending"
  | "in_progress"
  | "awaiting_dns"
  | "ready"
  | "rejected"
  | "cancelled";

export interface CreatorDomainRequest {
  id: string;
  creatorId: string;
  creatorName?: string;
  requestedDomain: string;
  status: CreatorDomainStatus;
  requestedAt: string;
  updatedAt: string;
  readyAt?: string;
}
