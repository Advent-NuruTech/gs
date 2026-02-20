"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import LessonForm from "@/components/course/LessonForm";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage } from "@/lib/cloudinary/uploadImage";
import { createCourse } from "@/services/courseService";
import { LessonDraft } from "@/types/lesson";

function emptyLesson(): LessonDraft {
  return {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title: "",
    contentHTML: "<p>Lesson notes...</p>",
    imageUrl: "",
    videoUrl: "",
    quiz: [],
  };
}

export default function CourseUploadForm() {
  const router = useRouter();
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();

  const [title, setTitle] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [outline, setOutline] = useState("<p>Course outline...</p>");
  const [publishNow, setPublishNow] = useState(true);
  const [lessons, setLessons] = useState<LessonDraft[]>([emptyLesson()]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const estimatedFinalPrice = useMemo(() => {
    const original = Number(originalPrice || 0);
    const discounted = Number(discountedPrice || 0);
    return Math.max(0, original - discounted);
  }, [discountedPrice, originalPrice]);

  const handleThumbnailUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingThumb(true);
    try {
      const uploaded = await uploadImage(file, "adventskool/courses");
      setThumbnailUrl(uploaded);
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
      pushToast("Only teachers or admins can create courses.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const courseId = await createCourse({
        title,
        originalPrice: Number(originalPrice),
        discountedPrice: Number(discountedPrice),
        thumbnailUrl,
        outline,
        instructorId: profile.id,
        published: publishNow,
        lessons,
      });

      pushToast("Course created successfully.", "success");
      router.push(`/dashboard/teacher/courses/${courseId}/edit`);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Failed to create course.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900">Course Upload</h3>
        <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Original Price"
            type="number"
            value={originalPrice}
            onChange={(event) => setOriginalPrice(event.target.value)}
            required
          />
          <Input
            label="Discounted Price"
            type="number"
            value={discountedPrice}
            onChange={(event) => setDiscountedPrice(event.target.value)}
            required
          />
        </div>
        <p className="text-sm text-slate-600">Amount students will pay: ${estimatedFinalPrice}</p>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Course Thumbnail
          <input type="file" accept="image/*" onChange={handleThumbnailUpload} />
          {uploadingThumb ? <span className="text-xs text-slate-500">Uploading...</span> : null}
        </label>
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt="Course thumbnail"
            width={1280}
            height={320}
            className="h-40 w-full rounded-md object-cover"
          />
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Course Outline</p>
          <RichTextEditor value={outline} onChange={setOutline} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(event) => setPublishNow(event.target.checked)}
          />
          Publish immediately
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Lessons</h3>
          <Button type="button" variant="secondary" onClick={() => setLessons((prev) => [...prev, emptyLesson()])}>
            Add Lesson
          </Button>
        </div>
        {lessons.map((lesson, index) => (
          <LessonForm
            key={lesson.id}
            index={index}
            lesson={lesson}
            onChange={(updated) =>
              setLessons((prev) => prev.map((item) => (item.id === lesson.id ? updated : item)))
            }
            onRemove={() => setLessons((prev) => prev.filter((item) => item.id !== lesson.id))}
          />
        ))}
      </section>

      <Button type="submit" disabled={submitting || uploadingThumb}>
        {submitting ? "Saving..." : "Create Course"}
      </Button>
    </form>
  );
}
