import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";

import { truncateText } from "@/lib/utils/plainText";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");

async function getCourseForMetadata(
  courseId: string,
): Promise<{ title: string; description: string; thumbnailUrl: string } | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
        },
      },
    },
  );

  const { data } = await supabase
    .from("courses")
    .select("title, outline, thumbnail_url")
    .eq("id", courseId)
    .eq("published", true)
    .maybeSingle();

  if (!data) return null;

  return {
    title: String(data.title ?? ""),
    description: String(data.outline ?? ""),
    thumbnailUrl: String(data.thumbnail_url ?? ""),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const { courseId } = await params;
  const course = await getCourseForMetadata(courseId);

  if (!course) {
    return {
      title: "Course Not Found",
      robots: { index: false },
    };
  }

  const description = truncateText(course.description, 200) || `Explore ${course.title} on AdventSkool.`;
  const url = `${siteUrl}/courses/${encodeURIComponent(courseId)}`;
  const images = course.thumbnailUrl
    ? [{ url: course.thumbnailUrl, alt: course.title }]
    : undefined;

  return {
    title: course.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: course.title,
      description,
      siteName: "AdventSkool",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: course.title,
      description,
      images: course.thumbnailUrl ? [course.thumbnailUrl] : [],
    },
    other: {
      "product:retailer_item_id": courseId,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getCourseForMetadata(courseId);
  if (!course) return <>{children}</>;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: truncateText(course.description, 500),
    provider: { "@type": "Organization", name: "AdventSkool", sameAs: siteUrl },
    url: `${siteUrl}/courses/${encodeURIComponent(courseId)}`,
    image: course.thumbnailUrl || undefined,
    inLanguage: "en",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      {children}
    </>
  );
}
