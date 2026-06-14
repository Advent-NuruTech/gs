"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  EmailCampaign,
  createCampaign,
  listCampaigns,
  previewCampaign,
} from "@/services/emailCampaignService";

const supabase = getSupabaseBrowserClient();

const STATUS_STYLES: Record<EmailCampaign["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  queued: "bg-sky-100 text-sky-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  canceled: "bg-slate-100 text-slate-600",
};

export default function EmailCampaignComposer() {
  const { pushToast } = useNotificationContext();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [audience, setAudience] = useState<"all" | "category">("all");
  const [category, setCategory] = useState("");
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("category").eq("published", true);
      const rows = (data ?? []) as Array<{ category: string | null }>;
      const unique = Array.from(
        new Set(rows.map((r) => String(r.category ?? "").trim()).filter(Boolean)),
      ).sort();
      setCategories(unique);
    })();
    listCampaigns().then(setCampaigns).catch(() => undefined);
  }, []);

  const canSubmit = useMemo(
    () =>
      title.trim() &&
      subject.trim() &&
      htmlContent.trim() &&
      (audience === "all" || category.trim()) &&
      (schedule === "now" || scheduledAt),
    [title, subject, htmlContent, audience, category, schedule, scheduledAt],
  );

  const onPreview = async () => {
    try {
      const html = await previewCampaign(subject || "Your subject line", htmlContent);
      setPreviewHtml(html);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Preview failed.", "error");
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await createCampaign({
        title,
        subject,
        htmlContent,
        targetAudience: audience,
        category: audience === "category" ? category : null,
        sendNow: schedule === "now",
        scheduledAt: schedule === "later" ? new Date(scheduledAt).toISOString() : null,
      });
      pushToast(
        schedule === "now" ? "Campaign queued for delivery." : "Campaign scheduled.",
        "success",
      );
      setTitle("");
      setSubject("");
      setHtmlContent("");
      setAudience("all");
      setCategory("");
      setSchedule("now");
      setScheduledAt("");
      setPreviewHtml(null);
      setCampaigns(await listCampaigns());
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not create campaign.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-bold text-slate-900">Email Campaigns</h2>
        <p className="mt-1 text-sm text-slate-600">
          Send a branded email to all subscribers or to learners interested in a category. Delivery
          is queued and rate-limited automatically.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <Input
            label="Campaign title (internal)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="June product update"
            required
          />
          <Input
            label="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="New courses just landed ✨"
            required
          />

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Audience
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as "all" | "category")}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="all">All subscribers</option>
              <option value="category">Category — interested learners</option>
            </select>
          </label>

          {audience === "category" && (
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                required
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Content (HTML or plain text)
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="<h1>Hello!</h1><p>Here's what's new…</p>"
              rows={8}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none ring-blue-500 transition focus:ring-2"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Send
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as "now" | "later")}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="now">Immediately</option>
                <option value="later">At a future time</option>
              </select>
            </label>
            {schedule === "later" && (
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                When
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </label>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onPreview} disabled={!htmlContent.trim()}>
              Preview
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Saving…" : schedule === "now" ? "Send Campaign" : "Schedule Campaign"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Preview</h3>
          {previewHtml ? (
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              className="h-[520px] w-full rounded-md border border-slate-200"
            />
          ) : (
            <div className="flex h-[520px] items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-400">
              Click “Preview” to see the branded email.
            </div>
          )}
        </div>
      </form>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900">Recent campaigns</h3>
        {campaigns.length === 0 ? (
          <p className="text-sm text-slate-600">No campaigns yet.</p>
        ) : (
          campaigns.map((c) => (
            <article key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3">
              <div>
                <p className="font-semibold text-slate-900">{c.title}</p>
                <p className="text-sm text-slate-600">{c.subject}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {c.targetAudience === "category" ? `Category: ${c.category}` : "All subscribers"}
                  {" · "}
                  {c.recipientsCount} recipients
                  {c.scheduledAt ? ` · ${new Date(c.scheduledAt).toLocaleString()}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[c.status]}`}>
                {c.status}
              </span>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
