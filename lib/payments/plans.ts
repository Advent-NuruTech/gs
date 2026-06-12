import { Course } from "@/types/course";
import { Lesson } from "@/types/lesson";
import { PaymentPlanOption, PlanType } from "@/types/payment";

export interface LessonLike {
  id: string;
  title: string;
  order: number;
}

function ordered(lessons: LessonLike[]): LessonLike[] {
  return [...lessons].sort((a, b) => a.order - b.order);
}

/**
 * Splits a course's final price across its lessons as evenly as possible.
 * Returns a map of lessonId -> integer price. The sum always equals the course
 * final price (remainder is distributed across the last lessons).
 *
 * Example: 4000 / 4 lessons -> { l1:1000, l2:1000, l3:1000, l4:1000 }
 */
export function perLessonPrices(course: Course, lessons: LessonLike[]): Map<string, number> {
  const list = ordered(lessons);
  const total = list.length;
  const prices = new Map<string, number>();
  if (total === 0) return prices;

  const finalPrice = Math.max(0, Math.round(course.finalPrice));
  const base = Math.floor(finalPrice / total);
  let remainder = finalPrice - base * total;

  // Give the extra shilling(s) to the last lessons so early lessons stay round.
  for (let i = 0; i < total; i += 1) {
    const extra = i >= total - remainder ? 1 : 0;
    prices.set(list[i].id, base + extra);
  }
  // Guard against any rounding drift.
  remainder = 0;
  return prices;
}

/** Total price for an arbitrary set of lessons (used for full / bundle / per-lesson). */
export function amountForLessons(
  course: Course,
  lessons: LessonLike[],
  lessonIds: string[],
): number {
  const prices = perLessonPrices(course, lessons);
  const set = new Set(lessonIds);
  let sum = 0;
  for (const [id, price] of prices) {
    if (set.has(id)) sum += price;
  }
  return sum;
}

/**
 * Builds the plan options shown at checkout. `lockedLessonIds` are lessons the
 * user still needs to buy (already-unlocked lessons are excluded from
 * installment/full pricing so they are never charged twice).
 */
export function derivePlanOptions(
  course: Course,
  lessons: Lesson[],
  unlockedLessonIds: string[] = [],
): PaymentPlanOption[] {
  const list = ordered(lessons.map((l) => ({ id: l.id, title: l.title, order: l.order })));
  const prices = perLessonPrices(course, list);
  const unlocked = new Set(unlockedLessonIds);
  const lockedLessons = list.filter((l) => !unlocked.has(l.id));

  const options: PaymentPlanOption[] = [];

  // Full course — all remaining lessons at once.
  const fullLessonIds = lockedLessons.map((l) => l.id);
  if (fullLessonIds.length > 0) {
    options.push({
      planType: "full",
      label: unlocked.size > 0 ? "Pay Remaining Balance" : "Full Course",
      description:
        unlocked.size > 0
          ? "Unlock every remaining lesson and get lifetime access."
          : "Unlock all lessons instantly with lifetime access and future updates.",
      amount: fullLessonIds.reduce((sum, id) => sum + (prices.get(id) ?? 0), 0),
      lessonIds: fullLessonIds,
    });
  }

  // Installment — pay for the next locked lesson only (sequential).
  const nextLesson = lockedLessons[0];
  if (nextLesson && lockedLessons.length > 1) {
    options.push({
      planType: "installment",
      label: "Pay in Installments",
      description: `Pay lesson by lesson. Next up: “${nextLesson.title}”.`,
      amount: prices.get(nextLesson.id) ?? 0,
      lessonIds: [nextLesson.id],
    });
  }

  return options;
}

/** Human label for a plan type. */
export function planLabel(planType: PlanType): string {
  switch (planType) {
    case "full":
      return "Full Course";
    case "per_lesson":
      return "Single Lesson";
    case "installment":
      return "Installment";
    case "bundle":
      return "Custom Bundle";
    default:
      return planType;
  }
}
