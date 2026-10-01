export type UserRole = "student" | "teacher" | "admin";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  role: UserRole;
  photoURL?: string;
  marketingSubscribed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  creatorStatus?: "none" | "pending" | "approved" | "rejected";
  suspendedUntil?: string | null;
  whatsapp?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  role?: UserRole;
  marketingSubscribed?: boolean;
  creatorApplication?: boolean;
  whatsapp?: string;
}
