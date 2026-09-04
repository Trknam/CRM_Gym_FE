import { prisma } from "@/lib/db/prisma";
import { getAccessibleBranchIds } from "@/lib/auth/authorization";

export async function accessibleBranchWhere() {
  const ids = await getAccessibleBranchIds();
  return ids === null ? {} : { branchId: { in: ids } };
}

export async function defaultBranchId() {
  const ids = await getAccessibleBranchIds();
  if (ids !== null) return ids[0] ?? null;
  return (await prisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } }))?.id ?? null;
}
