"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
const valkey_1 = require("../cache/valkey");
const keys_1 = require("../cache/keys");
const branches_1 = require("../api/branches");
const out = (x) => ({ id: x.id, name: x.name, value: x.value, group: x.group });
exports.settingsRoutes = (0, express_1.Router)();
exports.settingsRoutes.get("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "settings.read");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req), key = keys_1.cacheKeys.settings(ids === null ? "all" : ids.sort().join(",") || "none"), cached = await (0, valkey_1.cacheGet)(key);
    if (cached)
        return res.json({ data: cached, cached: true });
    const rows = await prisma_1.prisma.gymSetting.findMany({ where: ids === null ? {} : { branchId: { in: ids } }, orderBy: { name: "asc" } });
    const data = rows.map(out);
    await (0, valkey_1.cacheSet)(key, data, 120);
    return res.json({ data, cached: false });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    console.error("[settings] list failed", error);
    return res.status(500).json({ message: "Không thể lấy cài đặt." });
} });
exports.settingsRoutes.post("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "settings.update");
    const b = req.body ?? {}, branchId = await (0, branches_1.defaultBranchId)(req);
    if (!String(b.name ?? "").trim())
        return res.status(400).json({ message: "Tên cài đặt là bắt buộc." });
    const row = await prisma_1.prisma.gymSetting.create({ data: { branchId, name: String(b.name).trim(), value: String(b.value ?? "").trim(), group: String(b.group ?? "Hệ thống") } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.settings("all"));
    return res.status(201).json({ data: out(row) });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    console.error("[settings] create failed", error);
    return res.status(500).json({ message: "Không thể tạo cài đặt." });
} });
exports.settingsRoutes.patch("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "settings.update");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req), id = String(req.body?.id ?? ""), existing = await prisma_1.prisma.gymSetting.findFirst({ where: { id, ...(ids === null ? {} : { branchId: { in: ids } }) } });
    if (!existing)
        return res.status(404).json({ message: "Không tìm thấy cài đặt." });
    const b = req.body ?? {}, row = await prisma_1.prisma.gymSetting.update({ where: { id }, data: { name: String(b.name ?? existing.name), value: String(b.value ?? existing.value), group: String(b.group ?? existing.group) } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.settings("all"));
    return res.json({ data: out(row) });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    console.error("[settings] update failed", error);
    return res.status(500).json({ message: "Không thể cập nhật cài đặt." });
} });
exports.settingsRoutes.delete("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "settings.update");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req), id = String(req.body?.id ?? ""), existing = await prisma_1.prisma.gymSetting.findFirst({ where: { id, ...(ids === null ? {} : { branchId: { in: ids } }) } });
    if (!existing)
        return res.status(404).json({ message: "Không tìm thấy cài đặt." });
    await prisma_1.prisma.gymSetting.delete({ where: { id } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.settings("all"));
    return res.json({ message: "Đã xóa cài đặt." });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    console.error("[settings] delete failed", error);
    return res.status(500).json({ message: "Không thể xóa cài đặt." });
} });
