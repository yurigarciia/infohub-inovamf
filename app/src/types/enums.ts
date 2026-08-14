// Espelha os enums de app/prisma/schema.prisma. Ver docs/frontend-plan.md
// (T-FE-02) e docs/modelagem-banco.md para o raciocínio da modelagem.

export const UserRole = {
  ADMIN: "ADMIN",
  MENTOR: "MENTOR",
  STUDENT: "STUDENT",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const TeamMemberRole = {
  LEADER: "LEADER",
  MEMBER: "MEMBER",
} as const;
export type TeamMemberRole = (typeof TeamMemberRole)[keyof typeof TeamMemberRole];

export const IdeaMaturity = {
  IDEA: "IDEA",
  PROTOTYPE: "PROTOTYPE",
  MVP_IN_PROGRESS: "MVP_IN_PROGRESS",
  MVP_READY: "MVP_READY",
} as const;
export type IdeaMaturity = (typeof IdeaMaturity)[keyof typeof IdeaMaturity];

export const TaskStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  LATE: "LATE",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const ReviewStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const EmailNotificationType = {
  TASK_ASSIGNED: "TASK_ASSIGNED",
  DEADLINE_REMINDER: "DEADLINE_REMINDER",
  DEADLINE_LATE: "DEADLINE_LATE",
  SUBMISSION_APPROVED: "SUBMISSION_APPROVED",
  SUBMISSION_REJECTED: "SUBMISSION_REJECTED",
  NEW_TEAM_REGISTERED: "NEW_TEAM_REGISTERED",
  FILE_SUBMITTED: "FILE_SUBMITTED",
  TASK_LATE: "TASK_LATE",
  MANUAL_REMINDER: "MANUAL_REMINDER",
} as const;
export type EmailNotificationType =
  (typeof EmailNotificationType)[keyof typeof EmailNotificationType];

export const EmailNotificationStatus = {
  SENT: "SENT",
  FAILED: "FAILED",
  RETRIED: "RETRIED",
} as const;
export type EmailNotificationStatus =
  (typeof EmailNotificationStatus)[keyof typeof EmailNotificationStatus];
