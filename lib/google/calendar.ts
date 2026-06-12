import "server-only";

import { randomUUID } from "crypto";

/**
 * Google Calendar REST v3 helpers. Events are created on the HOST's primary
 * calendar with a Meet conference attached; attendees receive Google Calendar
 * invitations + reminders automatically (sendUpdates=all).
 */

const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

export interface CalendarEventInput {
  title: string;
  description?: string;
  /** ISO timestamps */
  start: string;
  end: string;
  timezone: string;
  attendeeEmails: string[];
  /** e.g. 'RRULE:FREQ=WEEKLY;COUNT=8' — omit for one-time meetings */
  recurrenceRule?: string | null;
  /** Attach a Google Meet conference (true for everything except reminders). */
  withMeet: boolean;
}

export interface CalendarEventResult {
  eventId: string;
  meetUrl: string | null;
  htmlLink: string | null;
}

interface GoogleEventPayload {
  id?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
  error?: { message?: string };
}

function eventBody(input: CalendarEventInput): Record<string, unknown> {
  // Google caps attendees; keep a sane margin (everyone still sees the
  // meeting + Join button inside AdventSkool regardless).
  const attendees = input.attendeeEmails
    .filter(Boolean)
    .slice(0, 150)
    .map((email) => ({ email }));

  return {
    summary: input.title,
    description: input.description ?? "",
    start: { dateTime: input.start, timeZone: input.timezone },
    end: { dateTime: input.end, timeZone: input.timezone },
    attendees,
    ...(input.recurrenceRule ? { recurrence: [input.recurrenceRule] } : {}),
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 60 },
        { method: "popup", minutes: 10 },
      ],
    },
    ...(input.withMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };
}

function parseEventResult(payload: GoogleEventPayload): CalendarEventResult {
  const videoEntry = payload.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video",
  );
  return {
    eventId: payload.id ?? "",
    meetUrl: payload.hangoutLink ?? videoEntry?.uri ?? null,
    htmlLink: payload.htmlLink ?? null,
  };
}

async function calendarFetch(
  accessToken: string,
  path: string,
  init: RequestInit,
): Promise<GoogleEventPayload> {
  const response = await fetch(`${CALENDAR_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (response.status === 204) return {};
  const payload = (await response.json().catch(() => ({}))) as GoogleEventPayload;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Google Calendar request failed (${response.status}).`);
  }
  return payload;
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  input: CalendarEventInput,
): Promise<CalendarEventResult> {
  const payload = await calendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    { method: "POST", body: JSON.stringify(eventBody(input)) },
  );
  return parseEventResult(payload);
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  input: CalendarEventInput,
): Promise<CalendarEventResult> {
  const body = eventBody(input);
  // Never replace an existing conference with a new createRequest.
  delete body.conferenceData;
  const payload = await calendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&sendUpdates=all`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return parseEventResult(payload);
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  try {
    await calendarFetch(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      { method: "DELETE" },
    );
  } catch (error) {
    // Already gone on Google's side is fine — keep cancellation idempotent.
    if (!(error instanceof Error) || !/(404|410|not found|deleted)/i.test(error.message)) {
      throw error;
    }
  }
}
