const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([\w-]{11})/i,
  /(?:youtu\.be\/)([\w-]{11})/i,
  /(?:youtube\.com\/embed\/)([\w-]{11})/i,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/i,
];

export function extractYoutubeId(videoUrl?: string): string {
  if (!videoUrl) return "";

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = videoUrl.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}
