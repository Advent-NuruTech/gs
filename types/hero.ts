export interface HomeHeroSlide {
  id: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  altText: string;
  sortOrder: number;
}

export interface HomeHeroSettings {
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
}

export interface HomeHeroContent {
  slides: HomeHeroSlide[];
  settings: HomeHeroSettings;
}

export function isSafeHeroHref(value: string): boolean {
  return /^\/(?!\/)/.test(value) || /^https:\/\//i.test(value);
}

export const DEFAULT_HOME_HERO_SETTINGS: HomeHeroSettings = {
  primaryCtaLabel: "Explore courses",
  primaryCtaHref: "/courses",
  secondaryCtaLabel: "Explore products",
  secondaryCtaHref: "/designs",
};

export const DEFAULT_HOME_HERO_SLIDES: HomeHeroSlide[] = [
  { id: "learn", desktopImageUrl: "/images/hero/adventskool-learn.png", mobileImageUrl: "/images/hero/adventskool-learn-mobile-v2.png", altText: "Learning online with AdventSkool on a laptop", sortOrder: 10 },
  { id: "create", desktopImageUrl: "/images/hero/adventskool-create.png", mobileImageUrl: "/images/hero/adventskool-create-mobile-v2.png", altText: "Creating digital work with a tablet and stylus", sortOrder: 20 },
  { id: "grow", desktopImageUrl: "/images/hero/adventskool-grow.png", mobileImageUrl: "/images/hero/adventskool-grow-mobile-v2.png", altText: "Learning from a phone with headphones", sortOrder: 30 },
  { id: "sell", desktopImageUrl: "/images/hero/adventskool-sell.png", mobileImageUrl: "/images/hero/adventskool-sell-mobile-v2.png", altText: "Presenting a finished digital resource on a tablet", sortOrder: 40 },
];
