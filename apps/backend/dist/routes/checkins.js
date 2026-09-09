"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkinsRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
const methods = { "QR Code": "QR_CODE", "Quầy lễ tân": "FRONT_DESK" };
const statuses = { "Hợp lệ": "VALID", "Từ chối": "REJECTED" };
const labels = { QR_CODE: "QR Code", FRONT_DESK: "Quầy lễ tân", VALID: "Hợp lệ", REJECTED: "Từ chối" };
const out = (x) => ({ id: x.id, member: x.member.fullName, memberId: x.memberId, time: x.checkedInAt.toISOString(), method: labels[x.method], status: labels[x.status] });
exports.checkinsRoutes = (0, express_1.Router)();
exports.checkinsRoutes.get("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "checkin.read");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const rows = await prisma_1.prisma.checkIn.findMany({ where: { branchId: { in: ids } }, include: { member: true }, orderBy: { checkedInAt: "desc" } });
    return res.json({ data: rows.map(out), cached: false });
}
catch (error) {
    console.error("[checkins] list failed", error);
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    return res.status(500).json({ message: "Không thể lấy lịch sử check-in." });
} });
exports.checkinsRoutes.post("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "checkin.create");
    const b = req.body ?? {}, memberId = String(b.memberId ?? "").trim();
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const member = await prisma_1.prisma.member.findFirst({ where: { id: memberId, branchId: { in: ids } }, include: { memberships: { where: { status: "ACTIVE" }, orderBy: { endDate: "desc" }, take: 1 } } });
    if (!member)
        return res.status(404).json({ message: "Không tìm thấy hội viên." });
    const row = await prisma_1.prisma.checkIn.create({ data: { branchId: member.branchId, memberId, checkedInAt: b.time ? new Date(b.time) : new Date(), method: methods[String(b.method)] ?? "FRONT_DESK", status: statuses[String(b.status)] ?? (member.memberships.length ? "VALID" : "REJECTED") }, include: { member: true } });
    return res.status(201).json({ data: out(row) });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    return res.status(500).json({ message: "Không thể tạo check-in." });
} });
exports.checkinsRoutes.patch("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "checkin.update");
    const b = req.body ?? {}, id = String(b.id ?? "").trim(), ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const existing = await prisma_1.prisma.checkIn.findFirst({ where: { id, branchId: { in: ids } } });
    if (!existing)
        return res.status(404).json({ message: "Không tìm thấy lượt check-in." });
    const memberId = String(b.memberId ?? existing.memberId).trim();
    const member = await prisma_1.prisma.member.findFirst({ where: { id: memberId, branchId: { in: ids } } });
    if (!member)
        return res.status(404).json({ message: "Không tìm thấy hội viên." });
    const row = await prisma_1.prisma.checkIn.update({ where: { id }, data: { memberId, branchId: member.branchId, checkedInAt: b.time ? new Date(b.time) : existing.checkedInAt, method: methods[String(b.method)] ?? existing.method, status: statuses[String(b.status)] ?? existing.status }, include: { member: true } });
    return res.json({ data: out(row) });
}
catch (error) {
    console.error("[checkins] update failed", error);
    return res.status(500).json({ message: "Không thể cập nhật check-in." });
} });
exports.checkinsRoutes.delete("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "checkin.delete");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const row = await prisma_1.prisma.checkIn.findFirst({ where: { id: String(req.body?.id), branchId: { in: ids } }, select: { id: true } });
    if (!row)
        return res.status(404).json({ message: "Không tìm thấy lượt check-in." });
    await prisma_1.prisma.checkIn.delete({ where: { id: row.id } });
    return res.json({ message: "Đã xóa lượt check-in." });
}
catch (error) {
    console.error("[checkins] delete failed", error);
    return res.status(500).json({ message: "Không thể xóa check-in." });
} });
