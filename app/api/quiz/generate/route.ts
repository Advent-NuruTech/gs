import { NextRequest, NextResponse } from "next/server";

import { QuizQuestion } from "@/types/quiz";

function randomId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFallbackQuiz(lessonTitle: string, lessonContent: string, count = 10): QuizQuestion[] {
  const text = stripHtml(lessonContent);
  const baseSentence = text.length > 30 ? text.slice(0, 220) : `Core ideas in ${lessonTitle}`;
  return Array.from({ length: count }).map((_, index) => {
    const correct = `Key point ${index + 1} from ${lessonTitle}`;
    const wrongA = `Unrelated fact ${index + 1}`;
    const wrongB = `Contradiction ${index + 1}`;
    const wrongC = `Skipped step ${index + 1}`;
    const optionIds = [randomId(), randomId(), randomId(), randomId()];

    return {
      id: randomId(),
      question: `Q${index + 1}: Which statement aligns with this lesson? (${baseSentence.slice(0, 80)}...)`,
      options: [
        { id: optionIds[0], label: correct },
        { id: optionIds[1], label: wrongA },
        { id: optionIds[2], label: wrongB },
        { id: optionIds[3], label: wrongC },
      ],
      correctOptionId: optionIds[0],
      explanation: `The correct answer reflects the lesson note context for "${lessonTitle}".`,
    };
  });
}

function tryParseQuestions(rawText: string): QuizQuestion[] | null {
  const jsonStart = rawText.indexOf("[");
  const jsonEnd = rawText.lastIndexOf("]");
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;

  try {
    const parsed = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1)) as Array<{
      question?: string;
      options?: string[];
      correctOptionIndex?: number;
      explanation?: string;
    }>;

    const questions = parsed
      .filter((item) => item.question && Array.isArray(item.options) && item.options.length >= 2)
      .slice(0, 10)
      .map((item) => {
        const options = (item.options ?? []).slice(0, 4);
        const optionRows = options.map((label) => ({
          id: randomId(),
          label: String(label),
        }));
        const rawIndex = Number(item.correctOptionIndex ?? 0);
        const index = Number.isFinite(rawIndex) && rawIndex >= 0 && rawIndex < optionRows.length ? rawIndex : 0;

        return {
          id: randomId(),
          question: String(item.question),
          options: optionRows,
          correctOptionId: optionRows[index]?.id ?? optionRows[0]?.id ?? randomId(),
          explanation: item.explanation ? String(item.explanation) : "Review the lesson note to confirm the right answer.",
        } satisfies QuizQuestion;
      });

    return questions.length ? questions : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      lessonTitle?: string;
      lessonContent?: string;
      count?: number;
    };

    const lessonTitle = String(body.lessonTitle ?? "Lesson");
    const lessonContent = String(body.lessonContent ?? "");
    const count = Math.min(10, Math.max(1, Number(body.count ?? 10)));

    const fallbackQuestions = buildFallbackQuiz(lessonTitle, lessonContent, count);
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ source: "fallback", questions: fallbackQuestions });
    }

    const prompt = `Generate ${count} multiple choice questions in strict JSON array only.
Each item must have keys: question (string), options (array of 4 strings), correctOptionIndex (0-3), explanation (string).
Lesson title: ${lessonTitle}
Lesson note:
${stripHtml(lessonContent).slice(0, 6000)}`;

    const response = await fetch("https://api-inference.huggingface.co/models/google/flan-t5-large", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1400,
          temperature: 0.3,
          return_full_text: false,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ source: "fallback", questions: fallbackQuestions });
    }

    const payload = (await response.json()) as Array<{ generated_text?: string }> | { generated_text?: string };
    const generatedText = Array.isArray(payload)
      ? String(payload[0]?.generated_text ?? "")
      : String(payload.generated_text ?? "");
    const parsed = tryParseQuestions(generatedText);
    if (!parsed) {
      return NextResponse.json({ source: "fallback", questions: fallbackQuestions });
    }

    return NextResponse.json({ source: "huggingface", questions: parsed });
  } catch {
    return NextResponse.json({
      source: "fallback",
      questions: buildFallbackQuiz("Lesson", "Core concepts revision", 10),
    });
  }
}
