"use client";

import { FormEvent } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatKsh } from "@/lib/utils/formatCurrency";

interface CheckoutCourseLine {
  id: string;
  title: string;
  amount: number;
}

interface PaymentDetailsProps {
  courses: CheckoutCourseLine[];
  fullName: string;
  email: string;
  phoneNumber: string;
  specialNote: string;
  paybillNumber: string;
  accountNumber: string;
  submitting: boolean;
  validPhoneNumber: boolean;
  onPhoneNumberChange: (value: string) => void;
  onSpecialNoteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function PaymentDetails({
  courses,
  fullName,
  email,
  phoneNumber,
  specialNote,
  paybillNumber,
  accountNumber,
  submitting,
  validPhoneNumber,
  onPhoneNumberChange,
  onSpecialNoteChange,
  onSubmit,
}: PaymentDetailsProps) {
  const totalAmount = courses.reduce((sum, course) => sum + course.amount, 0);

  return (
    <form className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={onSubmit}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Payment Details</h1>
        <p className="text-sm text-slate-600">
          Complete one payment for all selected courses.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product Purchased</p>
        <ul className="mt-3 space-y-2">
          {courses.map((course) => (
            <li key={course.id} className="flex items-start justify-between gap-3 text-sm text-slate-700">
              <span className="line-clamp-2">{course.title}</span>
              <span className="font-semibold text-slate-900">{formatKsh(course.amount)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Full Name" value={fullName} readOnly className="bg-slate-50 text-slate-500" required />
        <Input label="Email" type="email" value={email} readOnly className="bg-slate-50 text-slate-500" required />
      </div>

      <Input
        label="Phone Number (Country Code)"
        placeholder="+254700000000"
        value={phoneNumber}
        onChange={(event) => onPhoneNumberChange(event.target.value)}
        required
      />
      {!validPhoneNumber && phoneNumber ? (
        <p className="text-xs text-red-600">Use country code format like +254700000000.</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Paybill" value={paybillNumber} readOnly className="bg-slate-50 text-slate-700" />
        <Input label="Account" value={accountNumber} readOnly className="bg-slate-50 text-slate-700" />
      </div>

      <Input label="Amount" value={formatKsh(totalAmount)} readOnly className="bg-slate-50 text-slate-700" />

      <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
        <span>Special Note (Optional)</span>
        <textarea
          value={specialNote}
          onChange={(event) => onSpecialNoteChange(event.target.value)}
          placeholder="Example: Paid via M-Pesa at 10:30 AM, reference XYZ..."
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2"
        />
      </label>

      <Button type="submit" disabled={submitting || !validPhoneNumber || courses.length === 0} className="w-full">
        {submitting ? "Submitting..." : "Submit Payment"}
      </Button>
    </form>
  );
}
