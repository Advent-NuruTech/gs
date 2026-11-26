"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";

interface ApplicationForm {
  full_name: string;
  email: string;
  phone: string;
  church: string;
  motivation: string;
  website: string;
}

const initialForm: ApplicationForm = {
  full_name: "",
  email: "",
  phone: "",
  church: "",
  motivation: "",
  website: "",
};

async function submitApplication(form: ApplicationForm) {
  const response = await fetch("/api/serve/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Your application could not be submitted.");
  return payload;
}

export default function ServeRegistrationPage() {
  const [form, setForm] = useState(initialForm);
  const action = useAsyncAction({
    action: submitApplication,
    successMessage: "Your application has been received. The SERVE team will be in touch.",
    onSuccess: () => setForm(initialForm),
  });

  const update = (key: keyof ApplicationForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void action.run(form);
  };

  return (
    <main className="min-h-screen bg-[#06182b] px-4 py-10 text-white sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/serve" className="inline-flex items-center gap-2 text-sm font-bold text-[#a5ff00] hover:underline">
          <span aria-hidden>←</span> SERVE* If Saved
        </Link>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-5 shadow-2xl sm:p-9">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-[#a5ff00]">Join the journey</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Register for SERVE</h1>
          <p className="mt-3 leading-7 text-white/70">
            Share a few details to apply for the 40-study Bible journey. The team will contact you with next steps.
          </p>

          <div className="mt-6 space-y-3">
            {action.successMessage ? <StatusCard kind="success" title={action.successMessage} /> : null}
            {action.errorMessage ? <StatusCard kind="error" title="Application not submitted" description={action.errorMessage} /> : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5 [&_label]:text-white/90">
            <Input
              id="serve-full-name"
              label="Full name"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              value={form.full_name}
              onChange={(event) => update("full_name", event.target.value)}
              className="border-white/20 bg-[#06182b] text-white placeholder:text-white/40 focus:border-[#a5ff00] focus:ring-[#a5ff00]"
            />
            <Input
              id="serve-email"
              label="Email address"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              className="border-white/20 bg-[#06182b] text-white placeholder:text-white/40 focus:border-[#a5ff00] focus:ring-[#a5ff00]"
            />
            <Input
              id="serve-phone"
              label="Phone number"
              type="tel"
              required
              minLength={7}
              maxLength={32}
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              className="border-white/20 bg-[#06182b] text-white placeholder:text-white/40 focus:border-[#a5ff00] focus:ring-[#a5ff00]"
            />
            <Input
              id="serve-church"
              label="Church or fellowship (optional)"
              maxLength={160}
              value={form.church}
              onChange={(event) => update("church", event.target.value)}
              className="border-white/20 bg-[#06182b] text-white placeholder:text-white/40 focus:border-[#a5ff00] focus:ring-[#a5ff00]"
            />
            <div className="flex flex-col gap-1.5 text-sm font-medium text-white/90">
              <label htmlFor="serve-motivation">What would you like to learn? (optional)</label>
              <textarea
                id="serve-motivation"
                rows={4}
                maxLength={1200}
                value={form.motivation}
                onChange={(event) => update("motivation", event.target.value)}
                className="w-full rounded-md border border-white/20 bg-[#06182b] px-3 py-2 text-white outline-none transition placeholder:text-white/40 focus:border-[#a5ff00] focus:ring-2 focus:ring-[#a5ff00]"
              />
            </div>
            <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
              <label htmlFor="serve-website">Leave this field empty</label>
              <input
                id="serve-website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => update("website", event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                type="submit"
                loading={action.isLoading}
                loadingText="Submitting..."
                className="bg-[#a5ff00] text-[#06182b] hover:bg-[#baff36]"
              >
                Submit application
              </Button>
              <Link href="/serve/timetable" className="text-sm font-semibold text-white/70 hover:text-[#a5ff00]">
                View the timetable
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
