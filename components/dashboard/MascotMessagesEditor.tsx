"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncData } from "@/hooks/useAsyncData";
import { MAX_MASCOT_MESSAGE_LENGTH, MAX_MASCOT_MESSAGES } from "@/lib/homeMascotMessages";
import { getHomeMascotMessages, updateHomeMascotMessages } from "@/services/homeMascotMessagesService";

export default function MascotMessagesEditor() {
  const messages = useAsyncData(getHomeMascotMessages, []);
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? messages.data?.join("\n") ?? "";
  const save = useAsyncAction({
    action: () => updateHomeMascotMessages(value.split("\n")),
    successMessage: "Homepage messages saved.",
    onSuccess: (saved) => { setDraft(saved.join("\n")); messages.reload(); },
  });

  return <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
    <div><h2 className="text-lg font-bold text-slate-950 dark:text-white">Homepage character messages</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Edit the speech bubbles shown by the walking characters on the homepage.</p></div>
    {messages.isLoading ? <StatusCard kind="loading" title="Loading character messages" /> : null}
    {messages.errorMessage ? <StatusCard kind="error" title="Could not load character messages" description={messages.errorMessage} actions={<Button variant="secondary" onClick={messages.reload}>Try again</Button>} /> : null}
    {save.isLoading ? <StatusCard kind="loading" title="Saving character messages" /> : null}
    {save.successMessage ? <StatusCard kind="success" title={save.successMessage} /> : null}
    {save.errorMessage ? <StatusCard kind="error" title="Could not save character messages" description={save.errorMessage} /> : null}
    {!messages.isLoading && !messages.errorMessage ? <>
      <Field label="Messages" htmlFor="mascot-messages" hint={`One message per line. Add 1–${MAX_MASCOT_MESSAGES} messages, up to ${MAX_MASCOT_MESSAGE_LENGTH} characters each.`}>
        <textarea id="mascot-messages" rows={12} value={value} onChange={(event) => { setDraft(event.target.value); save.reset(); }} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:outline-2 focus:outline-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      </Field>
      <div className="flex justify-end"><Button onClick={() => void save.run()} loading={save.isLoading} loadingText="Saving..." disabled={draft === null}>Save messages</Button></div>
    </> : null}
  </div>;
}
