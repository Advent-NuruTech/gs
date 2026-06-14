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
}

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  role?: UserRole;
  marketingSubscribed?: boolean;
}
