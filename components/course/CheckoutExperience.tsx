"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationContext } from "@/context/NotificationContext";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { amountForLessons, derivePlanOptions, perLessonPrices } from "@/lib/payments/plans";
import { getCourseById } from "@/services/courseService";
import { listCourseLessons } from "@/services/lessonService";
import { getEnrollmentByUserAndCourse } from "@/services/enrollmentService";
import { initializePayment } from "@/services/paymentService";
import { Course } from "@/types/course";
import { Lesson } from "@/types/lesson";
import { PaymentPlanOption, PlanType } from "@/types/payment";

interface Props {
  courseId: string;
}

type Step = "plans" | "pick-lessons" | "summary";

export default function CheckoutExperience({ courseId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectLesson = searchParams.get("lesson");
  const { profile, loading: authLoading } = useAuth();
  const { pushToast } = useNotificationContext();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState<Step>("plans");
  const [planType, setPlanType] = useState<PlanType>("full");
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [bundleMode, setBundleMode] = useState(false);

  // Redirect unauthenticated users to login.
  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.replace(`/login?redirect=${encodeURIComponent(`/courses/${courseId}/checkout`)}`);
    }
  }, [authLoading, profile, courseId, router]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!profile) return;
      setLoading(true);
      try {
        const [courseData, lessonData, enrollment] = await Promise.all([
          getCourseById(courseId),
          listCourseLessons(courseId),
          getEnrollmentByUserAndCourse(profile.id, courseId),
        ]);
        if (!active) return;
        setCourse(courseData);
        setLessons(lessonData);
        setUnlockedIds(enrollment?.unlockedLessons ?? []);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [courseId, profile]);

  const unlocked = useMemo(() => new Set(unlockedIds), [unlockedIds]);
  const lockedLessons = useMemo(
    () => lessons.filter((l) => !unlocked.has(l.id)),
    [lessons, unlocked],
  );
  const planOptions = useMemo(
    () => (course ? derivePlanOptions(course, lessons, unlockedIds) : []),
    [course, lessons, unlockedIds],
  );
  const prices = useMemo(
    () => (course ? perLessonPrices(course, lessons.map((l) => ({ id: l.id, title: l.title, order: l.order }))) : new Map<string, number>()),
    [course, lessons],
  );

  const currentAmount = useMemo(
    () => (course ? amountForLessons(course, lessons.map((l) => ({ id: l.id, title: l.title, order: l.order })), selectedLessonIds) : 0),
    [course, lessons, selectedLessonIds],
  );

  // Honour ?lesson= preselection -> single lesson summary.
  useEffect(() => {
    if (!preselectLesson || !lessons.length) return;
    if (unlocked.has(preselectLesson)) return;
    setPlanType("per_lesson");
    setSelectedLessonIds([preselectLesson]);
    setStep("summary");
  }, [preselectLesson, lessons.length, unlocked]);

  const choosePlanOption = (option: PaymentPlanOption) => {
    setPlanType(option.planType);
    setSelectedLessonIds(option.lessonIds);
    setStep("summary");
  };

  const startPerLesson = () => {
    setPlanType("per_lesson");
    setBundleMode(false);
    setSelectedLessonIds([]);
    setStep("pick-lessons");
  };

  const startBundle = () => {
    setPlanType("bundle");
    setBundleMode(true);
    setSelectedLessonIds([]);
    setStep("pick-lessons");
  };

  const toggleLesson = (lessonId: string) => {
    setSelectedLessonIds((current) => {
      if (bundleMode) {
        return current.includes(lessonId)
          ? current.filter((id) => id !== lessonId)
          : [...current, lessonId];
      }
      return [lessonId];
    });
  };

  const proceedToPay = async () => {
    if (!selectedLessonIds.length) {
      pushToast("Select at least one lesson.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const { authorizationUrl } = await initializePayment({
        courseId,
        planType,
        lessonIds: selectedLessonIds,
      });
      window.location.href = authorizationUrl;
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not start payment.", "error");
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <main className="mx-auto max-w-4xl px-4 py-10 text-slate-600">Preparing secure checkout…</main>;
  }
  if (!course) {
    return <main className="mx-auto max-w-4xl px-4 py-10 text-slate-600">Course not found.</main>;
  }

  if (lockedLessons.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900">You already own every lesson</h1>
          <p className="mt-2 text-slate-600">Head to your course and keep learning.</p>
          <Button className="mt-4" onClick={() => router.push(`/dashboard/student/my-courses/${courseId}`)}>
            Go to course
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header className="space-y-1">
        <p className="text-sm text-slate-500">Secure checkout</p>
        <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
        <p className="text-sm text-slate-600">Choose how you want to pay. You can always buy more lessons later.</p>
      </header>

      {step === "plans" && (
        <div className="grid gap-4">
          {planOptions.map((option) => (
            <button
              key={option.planType}
              type="button"
              onClick={() => choosePlanOption(option)}
              className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {option.planType === "full" ? (
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                    )}
                    <span className="font-semibold text-slate-900">{option.label}</span>
                  </div>
                  <p className="text-sm text-slate-600">{option.description}</p>
                </div>
                <span className="shrink-0 text-lg font-bold text-indigo-600">{formatKsh(option.amount)}</span>
              </div>
            </button>
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={startPerLesson}
              className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-indigo-300 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">Pay Per Lesson</p>
              <p className="mt-1 text-sm text-slate-600">Unlock a single lesson now.</p>
            </button>
            <button
              type="button"
              onClick={startBundle}
              className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-indigo-300 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">Custom Bundle</p>
              <p className="mt-1 text-sm text-slate-600">Pick any lessons you want and pay for just those.</p>
            </button>
          </div>
        </div>
      )}

      {step === "pick-lessons" && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700">
            {bundleMode ? "Select the lessons you want to unlock:" : "Choose the lesson to unlock:"}
          </p>
          <div className="grid gap-2">
            {lockedLessons.map((lesson) => {
              const checked = selectedLessonIds.includes(lesson.id);
              return (
                <label
                  key={lesson.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition ${
                    checked ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-200"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type={bundleMode ? "checkbox" : "radio"}
                      checked={checked}
                      onChange={() => toggleLesson(lesson.id)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      {lesson.order}. {lesson.title}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-slate-600">{formatKsh(prices.get(lesson.id) ?? 0)}</span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep("plans")}>Back</Button>
            <Button disabled={!selectedLessonIds.length} onClick={() => setStep("summary")}>
              Review {selectedLessonIds.length > 0 ? `· ${formatKsh(currentAmount)}` : ""}
            </Button>
          </div>
        </div>
      )}

      {step === "summary" && (
        <section className="mx-auto max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1 text-center">
            <ShieldCheck className="mx-auto h-9 w-9 text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-900">Confirm your payment</h2>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Course</dt><dd className="font-medium text-slate-900">{course.title}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Plan</dt><dd className="font-medium text-slate-900">{planLabelLocal(planType)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Lessons</dt><dd className="font-medium text-slate-900">{selectedLessonIds.length} unlocking</dd></div>
            {planType === "full" && (
              <div className="flex justify-between"><dt className="text-slate-500">Access</dt><dd className="font-medium text-emerald-700">Lifetime + future updates</dd></div>
            )}
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-3 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-indigo-600">{formatKsh(currentAmount)}</dd>
            </div>
          </dl>
          <p className="text-center text-sm text-slate-600">
            Are you sure you want to pay <span className="font-semibold">{formatKsh(currentAmount)}</span>?
          </p>
          <div className="space-y-2">
            <Button className="w-full" disabled={submitting} onClick={proceedToPay}>
              <span className="inline-flex items-center justify-center gap-2">
                <Lock className="h-4 w-4" />
                {submitting ? "Redirecting to Paystack…" : "Proceed Securely"}
              </span>
            </Button>
            <Button variant="secondary" className="w-full" disabled={submitting} onClick={() => setStep("plans")}>
              Choose Another Plan
            </Button>
          </div>
          <p className="text-center text-xs text-slate-400">You will be redirected to Paystack&apos;s secure checkout. We never see your card details.</p>
        </section>
      )}
    </main>
  );
}

function planLabelLocal(planType: PlanType): string {
  switch (planType) {
    case "full":
      return "Full / Remaining Course";
    case "installment":
      return "Installment";
    case "per_lesson":
      return "Single Lesson";
    case "bundle":
      return "Custom Bundle";
    default:
      return planType;
  }
}
