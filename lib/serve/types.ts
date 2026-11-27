export type ServeApplicationStatus = "pending" | "accepted" | "declined";

export interface ServeApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  church: string;
  motivation: string;
  status: ServeApplicationStatus;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface ServeTimetableEntry {
  id: string;
  study_number: number;
  title: string;
  description: string;
  session_date: string | null;
  start_time: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}
