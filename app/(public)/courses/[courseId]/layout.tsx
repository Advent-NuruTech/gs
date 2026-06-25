import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getCourseForMetadata(
  courseId: string,
): Promise<{ title: string; description: string; thumbnailUrl: string } | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
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

  const truncated =
    course.description.length > 200
      ? course.description.slice(0, 197) + "..."
      : course.description;

  return {
    title: course.title,
    description: truncated,
    openGraph: {
      title: course.title,
      description: truncated,
      images: course.thumbnailUrl ? [{ url: course.thumbnailUrl, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: course.title,
      description: truncated,
      images: course.thumbnailUrl ? [course.thumbnailUrl] : [],
    },
    robots: { index: true, follow: true },
  };
}

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
