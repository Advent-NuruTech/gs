"use client";

import { FormEvent, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { UserRole } from "@/types/user";

type ChatTask = "ask" | "generate_qa" | "study_notes";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  task: ChatTask;
  createdAt: string;
}

interface ChatTaskOption {
  value: ChatTask;
  label: string;
  helper: string;
}

interface ChatWithAIWorkspaceProps {
  role: UserRole;
}

const TASK_OPTIONS: Record<UserRole, ChatTaskOption[]> = {
  student: [
    { value: "ask", label: "Ask From Notes", helper: "Post questions with notes to get explanations." },
    { value: "study_notes", label: "Generate Study Notes", helper: "Turn rough content into structured notes." },
  ],
  teacher: [
    { value: "generate_qa", label: "Generate Q&A", helper: "Create teaching questions with answers." },
    { value: "study_notes", label: "Generate Study Notes", helper: "Build lesson-ready study notes quickly." },
    { value: "ask", label: "Ask a Teaching Question", helper: "Get help on class delivery or concept clarity." },
  ],
  admin: [
    { value: "generate_qa", label: "Generate Q&A", helper: "Prepare assessment questions and model answers." },
    { value: "study_notes", label: "Generate Study Notes", helper: "Create concise revision notes for learners." },
    { value: "ask", label: "Ask a Content Question", helper: "Get AI guidance on academic content." },
  ],
};

function roleTitle(role: UserRole): string {
  if (role === "teacher") return "Teacher AI Assistant";
  if (role === "admin") return "Admin AI Assistant";
  return "Student AI Assistant";
}

function userMessageLabel(task: ChatTask): string {
  if (task === "generate_qa") return "Generate Q&A";
  if (task === "study_notes") return "Generate Notes";
  return "Question";
}

function inputPlaceholder(task: ChatTask): string {
  if (task === "generate_qa") return "Add a topic, lesson title, or objective...";
  if (task === "study_notes") return "Add content to transform into clean study notes...";
  return "Ask your question...";
}

function shortId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function ChatWithAIWorkspace({ role }: ChatWithAIWorkspaceProps) {
  const { pushToast } = useNotificationContext();
  const taskOptions = TASK_OPTIONS[role];
  const [task, setTask] = useState<ChatTask>(taskOptions[0]?.value ?? "ask");
  const [prompt, setPrompt] = useState("");
  const [notes, setNotes] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedTask = useMemo(
    () => taskOptions.find((item) => item.value === task) ?? taskOptions[0],
    [task, taskOptions],
  );

  const canSubmit = useMemo(() => {
    return Boolean(prompt.trim() || notes.trim()) && !loading;
  }, [loading, notes, prompt]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const trimmedPrompt = prompt.trim();
    const trimmedNotes = notes.trim();
    const userContent = trimmedPrompt || trimmedNotes;
    const now = new Date().toISOString();

    const userMessage: ChatMessage = {
      id: shortId(),
      role: "user",
      content: `${userMessageLabel(task)}:\n${userContent}`,
      task,
      createdAt: now,
    };

    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          task,
          message: trimmedPrompt,
          notes: trimmedNotes,
        }),
      });

      const payload = (await response.json()) as { response?: string; error?: string };
      if (!response.ok || !payload.response) {
        throw new Error(payload.error || "Failed to generate AI response.");
      }

      const assistantMessage: ChatMessage = {
        id: shortId(),
        role: "assistant",
        content: payload.response,
        task,
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMessage]);
      setPrompt("");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "AI request failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-bold text-slate-900">Chat with AI</h2>
        <p className="mt-1 text-sm text-slate-600">{roleTitle(role)}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap gap-2">
          {taskOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTask(option.value)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                task === option.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-600">{selectedTask?.helper}</p>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Prompt
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={inputPlaceholder(task)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Paste lesson notes, study material, or context..."
            rows={6}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!canSubmit}>
            {loading ? "Generating..." : "Send to AI"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setMessages([])}
            disabled={loading || messages.length === 0}
          >
            Clear Conversation
          </Button>
        </div>
      </form>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900">Conversation</h3>
        {messages.length === 0 ? (
          <p className="text-sm text-slate-600">No messages yet. Ask your first question or generate content.</p>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-md border p-3 ${
                message.role === "assistant"
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {message.role === "assistant" ? "AI" : "You"}
              </p>
              <pre className="whitespace-pre-wrap break-words text-sm text-slate-800">{message.content}</pre>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
