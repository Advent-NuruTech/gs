import { deleteCloudinaryImageByUrl } from "@/lib/cloudinary/deleteImage";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DEFAULT_HOME_HERO_SETTINGS,
  HomeHeroContent,
  HomeHeroSettings,
  HomeHeroSlide,
  isSafeHeroHref,
} from "@/types/hero";

type HeroSlideRow = {
  id: string;
  desktop_image_url: string;
  mobile_image_url: string;
  alt_text: string;
  sort_order: number;
};

type HeroSettingsRow = {
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
};

function mapSlide(row: HeroSlideRow): HomeHeroSlide {
  return {
    id: row.id,
    desktopImageUrl: row.desktop_image_url,
    mobileImageUrl: row.mobile_image_url,
    altText: row.alt_text,
    sortOrder: Number(row.sort_order),
  };
}

function mapSettings(row: HeroSettingsRow | null): HomeHeroSettings {
  if (!row) return DEFAULT_HOME_HERO_SETTINGS;
  return {
    primaryCtaLabel: row.primary_cta_label,
    primaryCtaHref: row.primary_cta_href,
    secondaryCtaLabel: row.secondary_cta_label,
    secondaryCtaHref: row.secondary_cta_href,
  };
}

export async function getHomeHeroContent(): Promise<HomeHeroContent> {
  const supabase = getSupabaseBrowserClient();
  const [slidesResult, settingsResult] = await Promise.all([
    supabase.from("home_hero_slides").select("id,desktop_image_url,mobile_image_url,alt_text,sort_order").order("sort_order").order("created_at"),
    supabase.from("home_hero_settings").select("primary_cta_label,primary_cta_href,secondary_cta_label,secondary_cta_href").eq("id", true).maybeSingle(),
  ]);

  if (slidesResult.error) throw new Error(slidesResult.error.message);
  if (settingsResult.error) throw new Error(settingsResult.error.message);

  return {
    slides: ((slidesResult.data ?? []) as HeroSlideRow[]).map(mapSlide),
    settings: mapSettings(settingsResult.data as HeroSettingsRow | null),
  };
}

export async function createHomeHeroSlide(input: Omit<HomeHeroSlide, "id">): Promise<HomeHeroSlide> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("home_hero_slides")
    .insert({
      desktop_image_url: input.desktopImageUrl,
      mobile_image_url: input.mobileImageUrl,
      alt_text: input.altText,
      sort_order: input.sortOrder,
    })
    .select("id,desktop_image_url,mobile_image_url,alt_text,sort_order")
    .single();

  if (error) throw new Error(error.message);
  return mapSlide(data as HeroSlideRow);
}

export async function deleteHomeHeroSlide(slide: HomeHeroSlide): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("home_hero_slides").delete().eq("id", slide.id);
  if (error) throw new Error(error.message);

  const urls = [...new Set([slide.desktopImageUrl, slide.mobileImageUrl])];
  await Promise.all(urls.map((url) => deleteCloudinaryImageByUrl(url).catch(() => undefined)));
}

export async function updateHomeHeroSettings(settings: HomeHeroSettings): Promise<HomeHeroSettings> {
  const cleaned: HomeHeroSettings = {
    primaryCtaLabel: settings.primaryCtaLabel.trim(),
    primaryCtaHref: settings.primaryCtaHref.trim(),
    secondaryCtaLabel: settings.secondaryCtaLabel.trim(),
    secondaryCtaHref: settings.secondaryCtaHref.trim(),
  };
  if (!cleaned.primaryCtaLabel || !cleaned.secondaryCtaLabel) {
    throw new Error("Both hero action labels are required.");
  }
  if (!isSafeHeroHref(cleaned.primaryCtaHref) || !isSafeHeroHref(cleaned.secondaryCtaHref)) {
    throw new Error("Hero destinations must be an internal path beginning with / or a full https:// URL.");
  }
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("home_hero_settings")
    .update({
      primary_cta_label: cleaned.primaryCtaLabel,
      primary_cta_href: cleaned.primaryCtaHref,
      secondary_cta_label: cleaned.secondaryCtaLabel,
      secondary_cta_href: cleaned.secondaryCtaHref,
    })
    .eq("id", true)
    .select("primary_cta_label,primary_cta_href,secondary_cta_label,secondary_cta_href")
    .single();

  if (error) throw new Error(error.message);
  return mapSettings(data as HeroSettingsRow);
}
