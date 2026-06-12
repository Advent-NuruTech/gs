import { NextRequest, NextResponse } from "next/server";

import { UserRole } from "@/types/user";

type ChatTask = "ask" | "generate_qa" | "study_notes";

interface ChatRequestBody {
  role?: UserRole;
  task?: ChatTask;
  message?: string;
  notes?: string;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRole(role?: string): UserRole {
  if (role === "teacher" || role === "admin") return role;
  return "student";
}

function normalizeTask(task?: string): ChatTask {
  if (task === "generate_qa" || task === "study_notes") return task;
  return "ask";
}

function buildPrompt(role: UserRole, task: ChatTask, message: string, notes: string): string {
  const roleInstruction =
    role === "student"
      ? "You are an LMS tutor helping students learn clearly and step-by-step."
      : role === "teacher"
        ? "You are an instructional designer helping teachers create strong learning materials."
        : "You are an academic operations assistant helping admins produce study content and assessments.";

  if (task === "generate_qa") {
    return `${roleInstruction}
Generate 8 question and answer pairs from the notes.
Return plain text in this format:
Q1: ...
A1: ...
...
Keep answers concise and accurate.
Notes:
${notes.slice(0, 6000)}`;
  }

  if (task === "study_notes") {
    return `${roleInstruction}
Create high-quality study notes from the provided content.
Use this structure:
1) Key ideas
2) Important definitions
3) Practical examples
4) Quick revision checklist
Keep it concise and clear.
Content:
${(message || notes).slice(0, 6000)}`;
  }

  return `${roleInstruction}
Answer the user's question clearly and accurately.
If notes are provided, use them as the primary source.
Question: ${message.slice(0, 1200)}
Notes:
${notes.slice(0, 6000)}
Response style: short sections, simple language, no fluff.`;
}

function buildFallback(task: ChatTask, message: string, notes: string): string {
  const source = stripHtml(notes || message).slice(0, 1200);

  if (task === "generate_qa") {
    const base = source || "General study content";
    return [
      "Q1: What is the main idea of this topic?",
      `A1: ${base.slice(0, 160)}.`,
      "Q2: Which concept should be learned first?",
      "A2: Start with core definitions and the overall process before details.",
      "Q3: How can this be applied practically?",
      "A3: Use a small real-world example and explain each step.",
      "Q4: What mistakes should be avoided?",
      "A4: Avoid memorizing without understanding relationships between concepts.",
    ].join("\n");
  }

  if (task === "study_notes") {
    return [
      "1) Key ideas",
      source ? `- ${source.slice(0, 220)}` : "- Identify the core topic and its objective.",
      "2) Important definitions",
      "- Define major terms in one sentence each.",
      "3) Practical examples",
      "- Create one short example and show the expected outcome.",
      "4) Quick revision checklist",
      "- Can you explain the topic in 3-5 lines?",
      "- Can you solve one practice problem without help?",
    ].join("\n");
  }

  return [
    "Answer",
    source
      ? `Based on your notes: ${source.slice(0, 260)}`
      : "Share your notes for a more precise answer.",
    "",
    "Next step",
    "- Add more context, key terms, or examples from class notes for a stronger response.",
  ].join("\n");
}

async function runModel(prompt: string): Promise<string | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api-inference.huggingface.co/models/google/flan-t5-large", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 900,
        temperature: 0.3,
        return_full_text: false,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as Array<{ generated_text?: string }> | { generated_text?: string };
  const text = Array.isArray(payload)
    ? String(payload[0]?.generated_text ?? "")
    : String(payload.generated_text ?? "");

  return text.trim() || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const role = normalizeRole(body.role);
    const task = normalizeTask(body.task);
    const message = String(body.message ?? "").trim();
    const notes = stripHtml(String(body.notes ?? ""));

    if (!message && !notes) {
      return NextResponse.json({ error: "Please provide a question or notes." }, { status: 400 });
    }

    const prompt = buildPrompt(role, task, message, notes);
    const generated = await runModel(prompt);
    const output = generated ?? buildFallback(task, message, notes);

    return NextResponse.json({
      source: generated ? "huggingface" : "fallback",
      response: output,
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate response." }, { status: 500 });
  }
}
