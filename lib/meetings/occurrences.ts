import { Meeting } from "@/types/meeting";

export interface MeetingOccurrence {
  id: string;
  meeting: Meeting;
  startTime: string;
  endTime: string;
}

interface ParsedRule {
  frequency: "DAILY" | "WEEKLY";
  count: number;
}

function parseRule(rule?: string): ParsedRule | null {
  if (!rule?.startsWith("RRULE:")) return null;
  const parts = new Map(rule.slice(6).split(";").map((part) => part.split("=", 2) as [string, string]));
  const frequency = parts.get("FREQ");
  const count = Number(parts.get("COUNT") ?? "1");
  if ((frequency !== "DAILY" && frequency !== "WEEKLY") || !Number.isInteger(count) || count < 1) return null;
  return { frequency, count: Math.min(count, 366) };
}

/** Expands the compact RRULEs AdventSkool creates for month and agenda views. */
export function meetingOccurrencesInRange(
  meetings: Meeting[],
  rangeStart: Date,
  rangeEnd: Date,
): MeetingOccurrence[] {
  const result: MeetingOccurrence[] = [];
  for (const meeting of meetings) {
    const start = new Date(meeting.startTime);
    const end = new Date(meeting.endTime);
    const duration = Math.max(0, end.getTime() - start.getTime());
    const rule = parseRule(meeting.recurrenceRule);
    const count = rule?.count ?? 1;
    const interval = rule?.frequency === "WEEKLY" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    for (let sequence = 0; sequence < count; sequence += 1) {
      const occurrenceStart = new Date(start.getTime() + sequence * interval);
      if (occurrenceStart < rangeStart || occurrenceStart > rangeEnd) continue;
      result.push({
        id: `${meeting.id}-${sequence}`,
        meeting,
        startTime: occurrenceStart.toISOString(),
        endTime: new Date(occurrenceStart.getTime() + duration).toISOString(),
      });
    }
  }
  return result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}
