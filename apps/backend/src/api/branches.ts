import { prisma } from "../db/prisma";
import type { Request } from "express";
import { getAccessibleBranchIds } from "../auth/authorization";

/**
 * Single-location policy: Branch remains an internal DB relation only.
 * The UI never asks users to choose a branch and request bodies cannot select one.
 */
export async function getMainBranchId(): Promise<string> {
  const existing = await prisma.branch.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.branch.create({
    data: { code: "MAIN", name: "Phòng Gym chính", isActive: true },
    select: { id: true },
  });
  return created.id;
}

export async function accessibleBranchWhere(req: Request) {
  const ids = await getAccessibleBranchIds(req);
  return ids === null ? {} : { branchId: { in: ids } };
}

/** Backward-compatible name used by existing routes. */
export async function defaultBranchId(_req: Request) {
  return getMainBranchId();
}
