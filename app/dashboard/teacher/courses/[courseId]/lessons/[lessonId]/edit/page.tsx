"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import QuizForm from "@/components/course/QuizForm";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { getCourseById } from "@/services/courseService";
import { getLessonById, updateLesson } from "@/services/lessonService";
import { QuizQuestion } from "@/types/quiz";

export default function EditLessonPage() {
  const params = useParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const [title, setTitle] = useState("");
  const [contentHTML, setContentHTML] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const course = await getCourseById(params.courseId);
        if (course && profile?.role !== "admin" && course.instructorId !== profile?.id) {
          pushToast("You can only edit lessons in your own courses.", "error");
          router.replace("/dashboard/teacher/courses");
          return;
        }
        const lesson = await getLessonById(params.courseId, params.lessonId);
        if (!lesson) return;
        setTitle(lesson.title);
        setContentHTML(lesson.contentHTML);
        setImageUrl(lesson.imageUrl ?? "");
        setVideoUrl(lesson.videoUrl ?? "");
        setQuiz(lesson.quiz);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.courseId, params.lessonId, profile, pushToast, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateLesson(params.courseId, params.lessonId, {
        title,
        contentHTML,
        imageUrl,
        videoUrl,
        quiz,
      });
      pushToast("Lesson updated.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Lesson update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading lesson editor...</div>;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Edit Lesson</h2>
      <form className="space-y-4 rounded-md border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
        <Input label="Lesson Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Lesson Content</p>
          <RichTextEditor value={contentHTML} onChange={setContentHTML} />
        </div>
        <Input label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <Input label="Video URL" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={generatingQuiz}
            onClick={async () => {
              setGeneratingQuiz(true);
              try {
                const response = await fetch("/api/quiz/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    lessonTitle: title,
                    lessonContent: contentHTML,
                    count: 10,
                  }),
                });
                if (!response.ok) {
                  throw new Error("AI quiz generation failed.");
                }
                const payload = (await response.json()) as { questions?: QuizQuestion[] };
                if (!payload.questions?.length) {
                  throw new Error("No generated questions returned.");
                }
                setQuiz(payload.questions);
                pushToast("Generated 10 quiz questions.", "success");
              } catch (error) {
                pushToast(error instanceof Error ? error.message : "Failed to generate quiz questions.", "error");
              } finally {
                setGeneratingQuiz(false);
              }
            }}
          >
            {generatingQuiz ? "Generating Quiz..." : "Generate 10 AI Questions"}
          </Button>
        </div>
        <QuizForm value={quiz} onChange={setQuiz} />
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Lesson"}
        </Button>
      </form>
    </section>
  );
}
