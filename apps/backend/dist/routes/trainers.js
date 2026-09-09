"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainersRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
const password_1 = require("../auth/password");
const valkey_1 = require("../cache/valkey");
const keys_1 = require("../cache/keys");
const branches_1 = require("../api/branches");
const out = (u) => ({ id: u.id, name: u.fullName, email: u.email ?? "", phone: u.phone ?? "", specialty: u.trainerProfile?.specialty ?? "", status: u.isActive ? "Đang hoạt động" : "Tạm nghỉ" });
exports.trainersRoutes = (0, express_1.Router)();
async function filter(req) { const ids = await (0, authorization_1.getAccessibleBranchIds)(req); return ids === null ? {} : { userBranches: { some: { branchId: { in: ids } } } }; }
exports.trainersRoutes.get("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "trainer.read");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const rows = await prisma_1.prisma.user.findMany({ where: { role: "TRAINER", userBranches: { some: { branchId: { in: ids } } } }, orderBy: { createdAt: "desc" }, include: { trainerProfile: true } });
    return res.json({ data: rows.map(out), cached: false });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    return res.status(500).json({ message: "Không thể lấy danh sách PT / Trainer." });
} });
exports.trainersRoutes.post("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "trainer.create");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req), b = req.body ?? {}, name = String(b.name ?? "").trim(), email = String(b.email ?? "").trim().toLowerCase(), phone = String(b.phone ?? "").trim(), password = String(b.password ?? "");
    if (!name || !phone || !email || password.length < 8)
        return res.status(400).json({ message: "Họ tên, email, số điện thoại và mật khẩu ít nhất 8 ký tự là bắt buộc." });
    const branchId = await (0, branches_1.defaultBranchId)(req);
    if (!branchId)
        return res.status(400).json({ message: "Chưa có chi nhánh để gán Trainer." });
    if (ids !== null && !ids.includes(branchId))
        return res.status(403).json({ message: "Bạn không có quyền tạo Trainer tại chi nhánh này." });
    const duplicate = await prisma_1.prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
    if (duplicate)
        return res.status(409).json({ message: "Email hoặc số điện thoại đã tồn tại." });
    const u = await prisma_1.prisma.user.create({ data: { fullName: name, email, phone, passwordHash: await (0, password_1.hashPassword)(password), role: "TRAINER", isActive: true, userBranches: { create: { branchId } }, trainerProfile: { create: { specialty: String(b.specialty ?? "").trim() || null } } }, include: { trainerProfile: true } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.trainers("all"));
    return res.status(201).json({ data: out(u) });
}
catch (error) {
    console.error("[trainers] create failed", error);
    return res.status(500).json({ message: "Không thể tạo PT / Trainer." });
} });
exports.trainersRoutes.patch("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "trainer.update");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req), b = req.body ?? {}, id = String(b.id ?? "");
    const u = await prisma_1.prisma.user.findFirst({ where: { id, role: "TRAINER", ...(ids === null ? {} : { userBranches: { some: { branchId: { in: ids } } } }) }, include: { trainerProfile: true } });
    if (!u)
        return res.status(404).json({ message: "Không tìm thấy Trainer hoặc bạn không có quyền." });
    const email = String(b.email ?? u.email ?? "").trim().toLowerCase(), phone = String(b.phone ?? u.phone ?? "").trim(), dup = await prisma_1.prisma.user.findFirst({ where: { id: { not: id }, OR: [{ email }, { phone }] } });
    if (dup)
        return res.status(409).json({ message: "Email hoặc số điện thoại đã được sử dụng." });
    const updated = await prisma_1.prisma.user.update({ where: { id }, data: { fullName: String(b.name ?? u.fullName).trim(), email, phone, isActive: b.status === undefined ? u.isActive : b.status === "Đang hoạt động", trainerProfile: { upsert: { create: { specialty: String(b.specialty ?? "").trim() || null }, update: { specialty: String(b.specialty ?? u.trainerProfile?.specialty ?? "").trim() || null } } } }, include: { trainerProfile: true } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.trainers("all"));
    return res.json({ data: out(updated) });
}
catch {
    return res.status(500).json({ message: "Không thể cập nhật PT / Trainer." });
} });
exports.trainersRoutes.delete("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "trainer.delete");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req), id = String(req.body?.id ?? ""), u = await prisma_1.prisma.user.findFirst({ where: { id, role: "TRAINER", ...(ids === null ? {} : { userBranches: { some: { branchId: { in: ids } } } }) }, select: { id: true } });
    if (!u)
        return res.status(404).json({ message: "Không tìm thấy Trainer hoặc bạn không có quyền." });
    await prisma_1.prisma.user.update({ where: { id }, data: { isActive: false } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.trainers("all"));
    return res.json({ message: "Đã ngừng hoạt động Trainer." });
}
catch {
    return res.status(500).json({ message: "Không thể xóa PT / Trainer." });
} });
