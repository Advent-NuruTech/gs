"use client";

import { useState } from "react";
import { Download, FileText, Printer, Sparkles } from "lucide-react";

import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import HandbookDocument from "@/components/dashboard/HandbookDocument";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import {
  HANDBOOK_MARKDOWN_FILENAME,
  HANDBOOK_META,
  handbookToMarkdown,
} from "@/lib/handbook/content";

function triggerFileDownload(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Admin-only handbook viewer. Offers three exports of the same content:
 * a printed PDF, a Markdown file, and a copyable AI grounding brief.
 */
export default function HandbookViewer() {
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin"]);
  const [printNotice, setPrintNotice] = useState(false);

  const copyAiBrief = useAsyncAction({
    action: async () => {
      const markdown = handbookToMarkdown();
      if (!navigator.clipboard) {
        triggerFileDownload(HANDBOOK_MARKDOWN_FILENAME, markdown, "text/markdown");
        return "clipboard-unavailable";
      }
      await navigator.clipboard.writeText(markdown);
      return "copied";
    },
    successMessage: (result) =>
      result === "clipboard-unavailable"
        ? `Your browser blocked clipboard access, so ${HANDBOOK_MARKDOWN_FILENAME} was downloaded instead.`
        : "The handbook is on your clipboard. Paste it into your AI assistant as grounding context.",
  });

  const downloadMarkdown = useAsyncAction({
    action: async () => {
      triggerFileDownload(HANDBOOK_MARKDOWN_FILENAME, handbookToMarkdown(), "text/markdown");
      return HANDBOOK_MARKDOWN_FILENAME;
    },
    successMessage: (filename) => `${filename} downloaded. Use it as training or retrieval data for an AI assistant.`,
  });

  const printHandbook = () => {
    const previousTitle = document.title;
    document.title = `${HANDBOOK_META.title} v${HANDBOOK_META.version}`;
    setPrintNotice(true);
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  if (guardLoading || !isAllowed) {
    return <PageSkeleton label="Checking your access to the handbook…" variant="plain" />;
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="no-print min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Reference</p>
        <h1 className="mt-1 break-words text-3xl font-bold text-slate-950 dark:text-white">Documentation handbook</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          The complete internal guide to what AdventSkool is, what it sells, and how creators are paid. Download it as a
          PDF, or export the Markdown file to ground or train an AI assistant on the platform.
        </p>
      </div>

      <Card className="no-print">
        <CardHeader
          title="Export this handbook"
          description={`Version ${HANDBOOK_META.version}. Every export is generated from the same source, so they always match.`}
        />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={printHandbook}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Download PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() => void downloadMarkdown.run()}
              loading={downloadMarkdown.isLoading}
              loadingText="Preparing Markdown…"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Markdown
            </Button>
            <Button
              variant="secondary"
              onClick={() => void copyAiBrief.run()}
              loading={copyAiBrief.isLoading}
              loadingText="Copying…"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Copy AI training brief
            </Button>
          </div>

          {printNotice ? (
            <StatusCard
              kind="info"
              title="Pick “Save as PDF” in the print dialog"
              description="In the Destination or Printer list choose “Save as PDF”, then confirm. The printed copy excludes the dashboard menus and export buttons."
              onDismiss={() => setPrintNotice(false)}
            />
          ) : null}

          {downloadMarkdown.status === "success" && downloadMarkdown.successMessage ? (
            <StatusCard
              kind="success"
              title="Markdown exported"
              description={downloadMarkdown.successMessage}
              onDismiss={downloadMarkdown.reset}
            />
          ) : null}

          {downloadMarkdown.status === "error" && downloadMarkdown.errorMessage ? (
            <StatusCard
              kind="error"
              title="The Markdown export failed"
              description={downloadMarkdown.errorMessage}
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void downloadMarkdown.run()}
                  loading={downloadMarkdown.isLoading}
                >
                  Try again
                </Button>
              }
            />
          ) : null}

          {copyAiBrief.status === "success" && copyAiBrief.successMessage ? (
            <StatusCard
              kind="success"
              title="AI brief ready"
              description={copyAiBrief.successMessage}
              onDismiss={copyAiBrief.reset}
            />
          ) : null}

          {copyAiBrief.status === "error" && copyAiBrief.errorMessage ? (
            <StatusCard
              kind="error"
              title="The AI brief could not be copied"
              description={`${copyAiBrief.errorMessage} Use “Download Markdown” and paste the file into your assistant instead.`}
              actions={
                <Button variant="secondary" size="sm" onClick={() => void downloadMarkdown.run()}>
                  Download Markdown instead
                </Button>
              }
            />
          ) : null}
        </CardBody>
      </Card>

      <Card className="no-print">
        <CardBody className="flex min-w-0 items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <p className="min-w-0 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Chapter 18 is written as a grounding brief. It carries the platform description, the authoritative facts,
            the glossary, approved answers, and the claims an assistant must never invent. Paste it into any AI
            assistant before asking questions about AdventSkool.
          </p>
        </CardBody>
      </Card>

      <HandbookDocument />
    </section>
  );
}
