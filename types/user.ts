export type UserRole = "student" | "teacher" | "admin";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
}
