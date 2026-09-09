import { prisma } from "../db/prisma";
import { getCurrentUser } from "./session";
import { getMainBranchId } from "../api/branches";
export { ROLE_LABELS } from "./role-labels";
import type { Request } from "express";

export type AppRole = "SUPER_ADMIN" | "BRANCH_MANAGER" | "STAFF" | "TRAINER";

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403, message: "UNAUTHORIZED" | "FORBIDDEN") {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireUser(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) throw new AuthError(401, "UNAUTHORIZED");
  return user;
}

export async function requireRole(req: Request, ...roles: AppRole[]) {
  const user = await requireUser(req);
  if (!roles.includes(user.role as AppRole)) throw new AuthError(403, "FORBIDDEN");
  return user;
}

export async function requirePermission(req: Request, permission: import("./permissions").Permission) {
  const user = await requireUser(req);
  const { hasPermission } = await import("./permissions");
  if (!hasPermission(user.role as AppRole, permission)) throw new AuthError(403, "FORBIDDEN");
  return user;
}

/** Single-location application: all users operate on the one main gym location. */
export async function getAccessibleBranchIds(_req: Request): Promise<string[]> {
  return [await getMainBranchId()];
}

export async function requireBranchAccess(req: Request, branchId: string) {
  await requireUser(req);
  const mainBranchId = await getMainBranchId();
  if (branchId !== mainBranchId) throw new AuthError(403, "FORBIDDEN");
  return getCurrentUser(req);
}

export async function assertBranchScope(req: Request, branchId: string) {
  return requireBranchAccess(req, branchId);
}
