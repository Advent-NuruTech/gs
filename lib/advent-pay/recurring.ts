import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type RecurrenceInterval = "weekly" | "monthly" | "quarterly" | "yearly";

type RecurringInvoiceRow = Record<string, unknown>;

const DAY = 86_400_000;

function asDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function addRecurringPeriod(date: string, interval: RecurrenceInterval, periods = 1) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (interval === "weekly") {
    const next = new Date(Date.UTC(year, month - 1, day + (7 * periods)));
    return next.toISOString().slice(0, 10);
  }
  const monthsToAdd = (interval === "monthly" ? 1 : interval === "quarterly" ? 3 : 12) * periods;
  const totalMonths = (month - 1) + monthsToAdd;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12;
  // The 29th–31st recur on the final calendar day where a month is shorter.
  const finalDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, finalDay))).toISOString().slice(0, 10);
}

function nextDueDateForSeries(latest: RecurringInvoiceRow) {
  const anchor = String(latest.recurrence_anchor_date ?? latest.due_date).slice(0, 10);
  const latestDate = dueDate(latest);
  const interval = String(latest.recurrence_interval) as RecurrenceInterval;
  if (interval === "weekly") {
    const periods = Math.max(0, Math.floor((asDate(latestDate).getTime() - asDate(anchor).getTime()) / (7 * DAY))) + 1;
    return addRecurringPeriod(anchor, interval, periods);
  }
  const [anchorYear, anchorMonth] = anchor.split("-").map(Number);
  const [latestYear, latestMonth] = latestDate.split("-").map(Number);
  const monthsPerPeriod = interval === "monthly" ? 1 : interval === "quarterly" ? 3 : 12;
  const periods = Math.max(0, Math.floor((((latestYear - anchorYear) * 12) + latestMonth - anchorMonth) / monthsPerPeriod)) + 1;
  return addRecurringPeriod(anchor, interval, periods);
}

export function daysUntil(date: string, today = todayIsoDate()) {
  return Math.round((asDate(date).getTime() - asDate(today).getTime()) / DAY);
}

function recurringSeriesId(row: RecurringInvoiceRow) {
  return String(row.recurring_series_id ?? row.id);
}

function dueDate(row: RecurringInvoiceRow) {
  return String(row.due_date).slice(0, 10);
}

function isRecurring(row: RecurringInvoiceRow) {
  return row.billing_type === "recurring" && Boolean(row.recurrence_interval);
}

/**
 * Issues every elapsed period in a recurring series. The schedule advances
 * from due dates (never from paid_at), so paying late cannot shift billing.
 */
export async function syncAdventPayRecurringInvoices() {
  const admin = getSupabaseAdminClient();
  const today = todayIsoDate();
  await admin
    .from("advent_pay_invoices")
    .update({ status: "overdue" })
    .eq("status", "pending")
    .lt("due_date", today);

  const { data, error } = await admin
    .from("advent_pay_invoices")
    .select("*")
    .eq("billing_type", "recurring")
    .order("due_date", { ascending: true });
  if (error) throw new Error(`Could not read recurring AdventPay invoices: ${error.message}`);

  const groups = new Map<string, RecurringInvoiceRow[]>();
  for (const row of (data ?? []) as RecurringInvoiceRow[]) {
    if (!isRecurring(row)) continue;
    const key = recurringSeriesId(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const created: Array<{ customerId: string; invoiceNumber: string; dueDate: string }> = [];
  for (const [seriesId, rows] of groups) {
    rows.sort((left, right) => dueDate(left).localeCompare(dueDate(right)));
    let template = rows[rows.length - 1];
    let nextDueDate = nextDueDateForSeries(template);
    while (nextDueDate <= today) {
      const { data: nextInvoice, error: insertError } = await admin.from("advent_pay_invoices").insert({
        customer_id: template.customer_id,
        customer_name: template.customer_name,
        customer_email: template.customer_email,
        description: template.description,
        amount: template.amount,
        due_date: nextDueDate,
        payment_method: template.payment_method,
        till_name_snapshot: template.till_name_snapshot ?? "",
        till_number_snapshot: template.till_number_snapshot ?? "",
        till_instructions_snapshot: template.till_instructions_snapshot ?? "",
        billing_type: "recurring",
        recurrence_interval: template.recurrence_interval,
        recurring_series_id: seriesId,
        recurrence_anchor_date: template.recurrence_anchor_date ?? dueDate(rows[0]),
        receipt_received_from_name: template.receipt_received_from_name ?? template.customer_name ?? "",
        receipt_received_from_email: template.receipt_received_from_email ?? template.customer_email ?? "",
        receipt_note: template.receipt_note ?? "",
        created_by: template.created_by ?? null,
      }).select("id,customer_id,invoice_number,due_date").single();

      if (insertError) {
        // The unique series/date constraint makes concurrent cron/dashboard
        // calls safe. Re-read on the next request instead of issuing a duplicate.
        if (insertError.code === "23505") break;
        throw new Error(`Could not issue recurring AdventPay invoice: ${insertError.message}`);
      }
      if (nextInvoice) {
        created.push({ customerId: String(nextInvoice.customer_id), invoiceNumber: String(nextInvoice.invoice_number), dueDate: String(nextInvoice.due_date) });
      }
      template = { ...template, due_date: nextDueDate };
      nextDueDate = nextDueDateForSeries(template);
    }
  }

  for (const invoice of created) {
    try {
      await admin.from("notifications").insert({
        user_id: invoice.customerId,
        title: "New recurring AdventPay invoice",
        message: `Invoice ${invoice.invoiceNumber} is due on ${invoice.dueDate}.`,
        link: "/adventpay/dashboard",
      });
    } catch { /* The invoice remains valid if notification delivery is unavailable. */ }
  }
  return { createdCount: created.length, today };
}

export function getRecurringSchedule(rows: RecurringInvoiceRow[], customerId?: string) {
  const groups = new Map<string, RecurringInvoiceRow[]>();
  for (const row of rows) {
    if (!isRecurring(row) || (customerId && String(row.customer_id) !== customerId)) continue;
    const key = recurringSeriesId(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  let nextDueDate = "";
  for (const seriesRows of groups.values()) {
    const latest = seriesRows.reduce((current, row) => dueDate(row) > dueDate(current) ? row : current);
    const next = nextDueDateForSeries(latest);
    if (!nextDueDate || next < nextDueDate) nextDueDate = next;
  }
  return { nextDueDate };
}

export function recurringPaymentMessage(rows: RecurringInvoiceRow[], invoice: RecurringInvoiceRow) {
  const seriesId = recurringSeriesId(invoice);
  const unpaid = rows
    .filter((row) => recurringSeriesId(row) === seriesId && row.status !== "paid" && row.status !== "void")
    .sort((left, right) => dueDate(left).localeCompare(dueDate(right)));
  if (unpaid.length) {
    const dates = unpaid.map((row) => dueDate(row)).join(" and ");
    return `You still have ${unpaid.length === 1 ? "an unpaid recurring invoice" : `${unpaid.length} unpaid recurring invoices`} due on ${dates}.`;
  }
  const { nextDueDate } = getRecurringSchedule(rows.filter((row) => recurringSeriesId(row) === seriesId));
  if (!nextDueDate) return "Your payment has been confirmed.";
  const days = daysUntil(nextDueDate);
  const timing = days === 0 ? "due today" : days === 1 ? "due tomorrow" : `due in ${days} days`;
  return `Your next ${String(invoice.recurrence_interval)} billing is due on ${nextDueDate} (${timing}).`;
}
