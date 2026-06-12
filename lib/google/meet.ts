import "server-only";

/**
 * Google Meet REST API v2 — conference records / participants.
 * NOTE: reading conference records requires the host to be a Google Workspace
 * user with the Meet API enabled; for consumer Gmail hosts this returns
 * nothing and AdventSkool falls back to in-app Join-click attendance.
 */

const MEET_BASE = "https://meet.googleapis.com/v2";

export interface MeetParticipantRecord {
  email: string | null;
  displayName: string | null;
  earliestStart: string | null;
  latestEnd: string | null;
}

function meetCodeFromUrl(meetUrl: string): string | null {
  const match = meetUrl.match(/meet\.google\.com\/([a-z0-9-]+)/i);
  return match ? match[1] : null;
}

/**
 * Best-effort fetch of participant sessions for the conference held at the
 * given Meet URL. Returns [] when the API is unavailable for this account.
 */
export async function fetchMeetParticipants(
  accessToken: string,
  meetUrl: string,
): Promise<MeetParticipantRecord[]> {
  const code = meetCodeFromUrl(meetUrl);
  if (!code) return [];

  const headers = { Authorization: `Bearer ${accessToken}` };

  // 1. Find conference records for this meeting code.
  const recordsResponse = await fetch(
    `${MEET_BASE}/conferenceRecords?filter=${encodeURIComponent(`space.meeting_code = "${code}"`)}`,
    { headers },
  );
  if (!recordsResponse.ok) return [];
  const recordsPayload = (await recordsResponse.json()) as {
    conferenceRecords?: Array<{ name?: string }>;
  };
  const records = recordsPayload.conferenceRecords ?? [];

  const participants: MeetParticipantRecord[] = [];
  for (const record of records) {
    if (!record.name) continue;
    const participantsResponse = await fetch(`${MEET_BASE}/${record.name}/participants`, { headers });
    if (!participantsResponse.ok) continue;
    const payload = (await participantsResponse.json()) as {
      participants?: Array<{
        earliestStartTime?: string;
        latestEndTime?: string;
        signedinUser?: { user?: string; displayName?: string };
        anonymousUser?: { displayName?: string };
      }>;
    };
    for (const participant of payload.participants ?? []) {
      participants.push({
        email: null, // Meet API exposes user resource names, not raw emails
        displayName:
          participant.signedinUser?.displayName ?? participant.anonymousUser?.displayName ?? null,
        earliestStart: participant.earliestStartTime ?? null,
        latestEnd: participant.latestEndTime ?? null,
      });
    }
  }
  return participants;
}
