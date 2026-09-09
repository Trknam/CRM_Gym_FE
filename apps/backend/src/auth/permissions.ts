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
  | "crm.read"
  | "crm.create"
  | "crm.update"
  | "crm.delete"
  | "payment.read"
  | "payment.create"
  | "payment.update"
  | "payment.delete"
  | "package.read"
  | "package.create"
  | "package.update"
  | "package.delete"
  | "checkin.read"
  | "checkin.create"
  | "checkin.update"
  | "checkin.delete"
  | "trainer.read"
  | "trainer.create"
  | "trainer.update"
  | "trainer.delete"
  | "exercise.read"
  | "exercise.create"
  | "exercise.update"
  | "exercise.delete"
  | "workout.read"
  | "workout.generate"
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
    "crm.read",
    "crm.create",
    "crm.update",
    "crm.delete",
    "payment.read",
    "payment.create",
    "payment.update",
    "payment.delete",
    "package.read",
    "package.create",
    "package.update",
    "package.delete",
    "checkin.read",
    "checkin.create",
    "checkin.update",
    "checkin.delete",
    "trainer.read",
    "trainer.create",
    "trainer.update",
    "trainer.delete",
    "exercise.read",
    "exercise.create",
    "exercise.update",
    "exercise.delete",
    "workout.read",
    "workout.generate",
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
    "crm.read",
    "crm.create",
    "crm.update",
    "crm.delete",
    "payment.read",
    "payment.create",
    "payment.update",
    "payment.delete",
    "package.read",
    "package.create",
    "package.update",
    "package.delete",
    "checkin.read",
    "checkin.create",
    "checkin.update",
    "checkin.delete",
    "trainer.read",
    "trainer.create",
    "trainer.update",
    "trainer.delete",
    "exercise.read",
    "exercise.create",
    "exercise.update",
    "exercise.delete",
    "workout.read",
    "workout.generate",
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
    "crm.read",
    "crm.create",
    "crm.update",
    "payment.read",
    "payment.create",
    "package.read",
    "checkin.read",
    "checkin.create",
    "trainer.read",
    "exercise.read",
    "exercise.create",
    "exercise.update",
    "exercise.delete",
    "workout.read",
    "workout.generate",
    "report.read",
  ],

  TRAINER: [
    "branch.read",
    "member.read",
    "checkin.read",
    "checkin.create",
    "trainer.read",
    "exercise.read",
    "workout.read",
    "workout.generate",
    "report.read",
  ],
};

export function hasPermission(
  role: "SUPER_ADMIN" | "BRANCH_MANAGER" | "STAFF" | "TRAINER",
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
