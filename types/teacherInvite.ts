export interface TeacherInvite {
  id: string;
  email: string;
  token: string;
  invitedBy: string;
  expiresAt: string;
  used: boolean;
  usedBy?: string;
  usedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
