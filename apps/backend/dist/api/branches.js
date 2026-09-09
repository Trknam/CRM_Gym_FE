"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMainBranchId = getMainBranchId;
exports.accessibleBranchWhere = accessibleBranchWhere;
exports.defaultBranchId = defaultBranchId;
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
/**
 * Single-location policy: Branch remains an internal DB relation only.
 * The UI never asks users to choose a branch and request bodies cannot select one.
 */
async function getMainBranchId() {
    const existing = await prisma_1.prisma.branch.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });
    if (existing)
        return existing.id;
    const created = await prisma_1.prisma.branch.create({
        data: { code: "MAIN", name: "Phòng Gym chính", isActive: true },
        select: { id: true },
    });
    return created.id;
}
async function accessibleBranchWhere(req) {
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    return ids === null ? {} : { branchId: { in: ids } };
}
/** Backward-compatible name used by existing routes. */
async function defaultBranchId(_req) {
    return getMainBranchId();
}
