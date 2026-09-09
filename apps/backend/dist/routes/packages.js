"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packagesRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
const valkey_1 = require("../cache/valkey");
const keys_1 = require("../cache/keys");
const branches_1 = require("../api/branches");
exports.packagesRoutes = (0, express_1.Router)();
const label = (s) => s === "ACTIVE" ? "Đang bán" : "Tạm dừng";
const map = (x) => ({ id: x.id, name: x.name, duration: Math.round(x.durationDays / 30), price: Number(x.price), status: label(x.status) });
exports.packagesRoutes.get("/", async (req, res) => {
    try {
        await (0, authorization_1.requirePermission)(req, "package.read");
        const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
        const scope = ids === null ? "all" : ids.sort().join(",") || "none";
        const status = String(req.query.status ?? "all");
        const key = keys_1.cacheKeys.packages(scope, status);
        const cached = await (0, valkey_1.cacheGet)(key);
        if (cached)
            return res.json({ data: cached, cached: true });
        const rows = await prisma_1.prisma.gymPackage.findMany({ where: { ...(ids === null ? {} : { branchId: { in: ids } }), ...(status === "ACTIVE" || status === "INACTIVE" ? { status } : {}) }, orderBy: { createdAt: "desc" } });
        const data = rows.map(map);
        await (0, valkey_1.cacheSet)(key, data, 60);
        return res.json({ data, cached: false });
    }
    catch (error) {
        const s = error?.status;
        if (s)
            return res.status(s).json({ message: error.message });
        return res.status(500).json({ message: "Không thể lấy danh sách gói tập." });
    }
});
exports.packagesRoutes.post("/", async (req, res) => {
    try {
        await (0, authorization_1.requirePermission)(req, "package.create");
        const b = req.body ?? {};
        const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
        const branchId = await (0, branches_1.defaultBranchId)(req);
        const duration = Number(b.duration);
        const price = Number(b.price);
        if (!branchId || !String(b.name ?? "").trim() || !duration || !Number.isFinite(price))
            return res.status(400).json({ message: "Thông tin gói tập không hợp lệ." });
        if (ids !== null && !ids.includes(branchId))
            return res.status(403).json({ message: "Bạn không có quyền tại chi nhánh này." });
        const count = await prisma_1.prisma.gymPackage.count({ where: { branchId } });
        const row = await prisma_1.prisma.gymPackage.create({ data: { branchId, code: `PKG-${String(count + 1).padStart(4, "0")}`, name: String(b.name).trim(), durationDays: duration * 30, price, status: b.status === "Tạm dừng" ? "INACTIVE" : "ACTIVE" } });
        await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.packages("all", "all"));
        return res.status(201).json({ data: map(row) });
    }
    catch (error) {
        const s = error?.status;
        if (s)
            return res.status(s).json({ message: error.message });
        return res.status(500).json({ message: "Không thể tạo gói tập." });
    }
});
exports.packagesRoutes.patch("/", async (req, res) => {
    try {
        await (0, authorization_1.requirePermission)(req, "package.update");
        const b = req.body ?? {};
        const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
        const existing = await prisma_1.prisma.gymPackage.findFirst({ where: { id: String(b.id), ...(ids === null ? {} : { branchId: { in: ids } }) } });
        if (!existing)
            return res.status(404).json({ message: "Không tìm thấy gói tập." });
        const row = await prisma_1.prisma.gymPackage.update({ where: { id: existing.id }, data: { name: String(b.name ?? existing.name).trim(), durationDays: Number(b.duration ?? existing.durationDays / 30) * 30, price: Number(b.price ?? existing.price), status: b.status === "Tạm dừng" ? "INACTIVE" : "ACTIVE" } });
        await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.packages("all", "all"));
        return res.json({ data: map(row) });
    }
    catch (error) {
        const s = error?.status;
        if (s)
            return res.status(s).json({ message: error.message });
        return res.status(500).json({ message: "Không thể cập nhật gói tập." });
    }
});
exports.packagesRoutes.delete("/", async (req, res) => {
    try {
        await (0, authorization_1.requirePermission)(req, "package.delete");
        const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
        const id = String(req.body?.id ?? "");
        const existing = await prisma_1.prisma.gymPackage.findFirst({ where: { id, ...(ids === null ? {} : { branchId: { in: ids } }) } });
        if (!existing)
            return res.status(404).json({ message: "Không tìm thấy gói tập." });
        await prisma_1.prisma.gymPackage.update({ where: { id }, data: { status: "INACTIVE" } });
        await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.packages("all", "all"));
        return res.json({ message: "Đã tạm dừng gói tập." });
    }
    catch (error) {
        const s = error?.status;
        if (s)
            return res.status(s).json({ message: error.message });
        return res.status(500).json({ message: "Không thể xóa gói tập." });
    }
});
