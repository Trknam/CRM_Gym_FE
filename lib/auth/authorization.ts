import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
export { ROLE_LABELS } from "@/lib/auth/role-labels";

export type AppRole = "SUPER_ADMIN" | "BRANCH_MANAGER" | "STAFF" | "TRAINER";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRole(...roles: AppRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as AppRole)) throw new Error("FORBIDDEN");
  return user;
}

/**
 * Kiểm tra người dùng hiện tại có quyền thực hiện một chức năng hay không.
 * Quyền được xác định bởi vai trò của người dùng.
 */
export async function requirePermission(permission: import("@/lib/auth/permissions").Permission) {
  const user = await requireUser();
  const { hasPermission } = await import("@/lib/auth/permissions");

  if (!hasPermission(user.role as AppRole, permission)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

/**
 * Trả về danh sách ID các chi nhánh mà người dùng hiện tại được phép truy cập.
 * SUPER_ADMIN có quyền trên toàn hệ thống nên được phép truy cập tất cả chi nhánh.
 */
export async function getAccessibleBranchIds(): Promise<string[] | null> {
  const user = await requireUser();

  if (user.role === "SUPER_ADMIN") return null;

  const memberships = await prisma.userBranch.findMany({
    where: {
      userId: user.id,
      branch: {
        is: {
          isActive: true,
        },
      },
    },
    select: { branchId: true },
  });

  return memberships.map(({ branchId }) => branchId);
}

/**
 * Kiểm tra người dùng hiện tại có được phép truy cập một chi nhánh cụ thể hay không.
 * SUPER_ADMIN có thể truy cập tất cả chi nhánh; các vai trò khác phải có phân quyền
 * thuộc một chi nhánh đang hoạt động.
 */
export async function requireBranchAccess(branchId: string) {
  const user = await requireUser();

  if (user.role === "SUPER_ADMIN") return user;

  const membership = await prisma.userBranch.findFirst({
    where: {
      userId: user.id,
      branchId,
      branch: {
        is: {
          isActive: true,
        },
      },
    },
    select: { id: true },
  });

  if (!membership) throw new Error("FORBIDDEN");
  return user;
}

/**
 * Bắt buộc tài nguyên đã thuộc một chi nhánh phải tuân thủ phạm vi truy cập của chi nhánh đó.
 */
export async function assertBranchScope(branchId: string) {
  return requireBranchAccess(branchId);
}
