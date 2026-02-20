"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import LessonForm from "@/components/course/LessonForm";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage } from "@/lib/cloudinary/uploadImage";
import { deleteCourse, getCourseById, replaceCourseLessonsCount, updateCourse } from "@/services/courseService";
import { createLesson, deleteLesson, listCourseLessons } from "@/services/lessonService";
import { Course } from "@/types/course";
import { Lesson, LessonDraft } from "@/types/lesson";

function emptyLessonDraft(): LessonDraft {
  return {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title: "",
    contentHTML: "<p>Lesson notes...</p>",
    imageUrl: "",
    videoUrl: "",
    quiz: [],
  };
}

export default function EditCoursePage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [draftLessons, setDraftLessons] = useState<LessonDraft[]>([]);
  const [savingDraftLessons, setSavingDraftLessons] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const [title, setTitle] = useState("");
  const [originalPrice, setOriginalPrice] = useState("0");
  const [discountedPrice, setDiscountedPrice] = useState("0");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [outline, setOutline] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    async function load() {
      const [courseData, lessonData] = await Promise.all([
        getCourseById(params.courseId),
        listCourseLessons(params.courseId),
      ]);
      if (courseData && profile?.role !== "admin" && courseData.instructorId !== profile?.id) {
        pushToast("You can only edit your own courses.", "error");
        router.replace("/dashboard/teacher/courses");
        return;
      }
      setCourse(courseData);
      setLessons(lessonData);
      if (courseData) {
        setTitle(courseData.title);
        setOriginalPrice(String(courseData.originalPrice));
        setDiscountedPrice(String(courseData.discountedPrice));
        setThumbnailUrl(courseData.thumbnailUrl);
        setOutline(courseData.outline);
        setPublished(courseData.published);
      }
    }
    void load();
  }, [params.courseId, profile, pushToast, router]);

  const handleThumbnailUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingThumb(true);
    try {
      const uploaded = await uploadImage(file, "adventskool/courses");
      setThumbnailUrl(uploaded);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Thumbnail upload failed.", "error");
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateCourse(params.courseId, {
        title,
        originalPrice: Number(originalPrice),
        discountedPrice: Number(discountedPrice),
        thumbnailUrl,
        outline,
        published,
      });
      pushToast("Course updated.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNewLessons = async () => {
    if (!draftLessons.length) {
      pushToast("Add at least one lesson draft first.", "error");
      return;
    }

    const invalidLesson = draftLessons.find((lesson) => !lesson.title.trim());
    if (invalidLesson) {
      pushToast("Every new lesson must have a title.", "error");
      return;
    }

    setSavingDraftLessons(true);
    try {
      const maxOrder = lessons.reduce((max, lesson) => Math.max(max, lesson.order), 0);
      for (const [index, lesson] of draftLessons.entries()) {
        await createLesson({
          courseId: params.courseId,
          title: lesson.title.trim(),
          contentHTML: lesson.contentHTML,
          imageUrl: lesson.imageUrl ?? "",
          videoUrl: lesson.videoUrl ?? "",
          quiz: lesson.quiz,
          order: maxOrder + index + 1,
        });
      }

      const refreshedLessons = await listCourseLessons(params.courseId);
      await replaceCourseLessonsCount(params.courseId, refreshedLessons.length);
      setLessons(refreshedLessons);
      setDraftLessons([]);
      pushToast("New lesson(s) added.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to add lessons.", "error");
    } finally {
      setSavingDraftLessons(false);
    }
  };

  if (!course) return <div>Loading course...</div>;

  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-bold text-slate-900">Edit Course</h2>
      <form className="space-y-4 rounded-md border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
        <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Original Price"
            type="number"
            value={originalPrice}
            onChange={(event) => setOriginalPrice(event.target.value)}
          />
          <Input
            label="Discounted Price"
            type="number"
            value={discountedPrice}
            onChange={(event) => setDiscountedPrice(event.target.value)}
          />
        </div>

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
          <p className="mb-2 text-sm font-medium text-slate-700">Outline</p>
          <RichTextEditor value={outline} onChange={setOutline} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
          Published
        </label>
        <Button type="submit" disabled={saving || uploadingThumb}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>

      <section className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Add New Lessons</h3>
          <Button type="button" variant="secondary" onClick={() => setDraftLessons((prev) => [...prev, emptyLessonDraft()])}>
            Add Lesson Draft
          </Button>
        </div>
        {draftLessons.length === 0 ? (
          <p className="text-sm text-slate-600">No new lesson draft yet.</p>
        ) : (
          <div className="space-y-3">
            {draftLessons.map((lesson, index) => (
              <LessonForm
                key={lesson.id}
                index={index}
                lesson={lesson}
                onChange={(updatedLesson) =>
                  setDraftLessons((prev) =>
                    prev.map((item) => (item.id === lesson.id ? updatedLesson : item)),
                  )
                }
                onRemove={() => setDraftLessons((prev) => prev.filter((item) => item.id !== lesson.id))}
              />
            ))}
          </div>
        )}
        <Button
          type="button"
          disabled={savingDraftLessons || draftLessons.length === 0}
          onClick={handleSaveNewLessons}
        >
          {savingDraftLessons ? "Saving lessons..." : "Save New Lessons"}
        </Button>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Existing Lessons</h3>
        <div className="space-y-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="rounded-md bg-slate-50 p-3">
              <p className="text-sm text-slate-700">
                {lesson.order}. {lesson.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/teacher/courses/${params.courseId}/lessons/${lesson.id}/edit`}
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  Edit lesson
                </Link>
                <button
                  type="button"
                  className="text-sm font-semibold text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={async () => {
                    setDeletingLessonId(lesson.id);
                    try {
                      await deleteLesson(params.courseId, lesson.id);
                      const remaining = lessons.filter((item) => item.id !== lesson.id);
                      await replaceCourseLessonsCount(params.courseId, remaining.length);
                      setLessons(remaining);
                      pushToast("Lesson deleted.", "success");
                    } catch (error) {
                      pushToast(error instanceof Error ? error.message : "Failed to delete lesson.", "error");
                    } finally {
                      setDeletingLessonId(null);
                    }
                  }}
                  disabled={deletingLessonId === lesson.id}
                >
                  {deletingLessonId === lesson.id ? "Deleting..." : "Delete lesson"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-red-200 bg-red-50 p-5">
        <h3 className="mb-2 text-lg font-semibold text-red-800">Danger Zone</h3>
        <p className="mb-3 text-sm text-red-700">Delete this course and all lessons under it.</p>
        <Button
          type="button"
          variant="danger"
          disabled={deletingCourse}
          onClick={async () => {
            setDeletingCourse(true);
            try {
              await deleteCourse(params.courseId);
              pushToast("Course deleted.", "success");
              router.push("/dashboard/teacher/courses");
            } catch (error) {
              pushToast(error instanceof Error ? error.message : "Failed to delete course.", "error");
            } finally {
              setDeletingCourse(false);
            }
          }}
        >
          {deletingCourse ? "Deleting..." : "Delete Course"}
        </Button>
      </section>
    </section>
  );
}
