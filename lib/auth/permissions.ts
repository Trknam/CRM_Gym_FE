export type Permission =
  | "branch.read"
  | "branch.create"
  | "branch.update"
  | "branch.delete"
  | "user.read"
  | "user.create"
  | "user.update"
  | "user.delete"
  | "member.read"
  | "member.create"
  | "member.update"
  | "member.delete"
  | "lead.read"
  | "lead.create"
  | "lead.update"
  | "lead.delete"
  | "payment.read"
  | "payment.create"
  | "payment.update"
  | "payment.delete"
  | "checkin.read"
  | "checkin.create"
  | "trainer.read"
  | "trainer.create"
  | "trainer.update"
  | "report.read"
  | "settings.read"
  | "settings.update";

export const ROLE_PERMISSIONS: Record<
  "SUPER_ADMIN" | "BRANCH_MANAGER" | "STAFF" | "TRAINER",
  readonly Permission[]
> = {
  SUPER_ADMIN: [
    "branch.read",
    "branch.create",
    "branch.update",
    "branch.delete",
    "user.read",
    "user.create",
    "user.update",
    "user.delete",
    "member.read",
    "member.create",
    "member.update",
    "member.delete",
    "lead.read",
    "lead.create",
    "lead.update",
    "lead.delete",
    "payment.read",
    "payment.create",
    "payment.update",
    "payment.delete",
    "checkin.read",
    "checkin.create",
    "trainer.read",
    "trainer.create",
    "trainer.update",
    "report.read",
    "settings.read",
    "settings.update",
  ],

  BRANCH_MANAGER: [
    "branch.read",
    "branch.update",
    "user.read",
    "user.create",
    "user.update",
    "member.read",
    "member.create",
    "member.update",
    "member.delete",
    "lead.read",
    "lead.create",
    "lead.update",
    "lead.delete",
    "payment.read",
    "payment.create",
    "payment.update",
    "payment.delete",
    "checkin.read",
    "checkin.create",
    "trainer.read",
    "trainer.create",
    "trainer.update",
    "report.read",
    "settings.read",
  ],

  STAFF: [
    "branch.read",
    "member.read",
    "member.create",
    "member.update",
    "lead.read",
    "lead.create",
    "lead.update",
    "payment.read",
    "payment.create",
    "checkin.read",
    "checkin.create",
    "trainer.read",
    "report.read",
  ],

  TRAINER: [
    "branch.read",
    "member.read",
    "checkin.read",
    "checkin.create",
    "trainer.read",
    "report.read",
  ],
};

export function hasPermission(
  role: "SUPER_ADMIN" | "BRANCH_MANAGER" | "STAFF" | "TRAINER",
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
