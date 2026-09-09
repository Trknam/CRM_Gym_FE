"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
const valkey_1 = require("../cache/valkey");
const keys_1 = require("../cache/keys");
const methodMap = { "Tiền mặt": "CASH", "Chuyển khoản": "BANK_TRANSFER", "Thẻ": "CARD" };
const statusMap = { "Đã thanh toán": "PAID", "Chờ thanh toán": "PENDING", "Đã hủy": "CANCELLED" };
const methods = { CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", CARD: "Thẻ" };
const statuses = { PAID: "Đã thanh toán", PENDING: "Chờ thanh toán", CANCELLED: "Đã hủy" };
const out = (x) => ({ id: x.id, member: x.member.fullName, memberId: x.memberId, amount: Number(x.amount), method: methods[x.method], status: statuses[x.status], date: (x.paidAt ?? x.createdAt).toISOString().slice(0, 10) });
exports.paymentsRoutes = (0, express_1.Router)();
exports.paymentsRoutes.get("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "payment.read");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const rows = await prisma_1.prisma.payment.findMany({ where: { branchId: { in: ids } }, include: { member: true }, orderBy: { createdAt: "desc" } });
    return res.json({ data: rows.map(out), cached: false });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    return res.status(500).json({ message: "Không thể lấy giao dịch." });
} });
exports.paymentsRoutes.post("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "payment.create");
    const b = req.body ?? {}, memberId = String(b.memberId ?? "").trim(), amount = Number(b.amount);
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const member = await prisma_1.prisma.member.findFirst({ where: { id: memberId, ...(ids === null ? {} : { branchId: { in: ids } }) } });
    if (!member || !Number.isFinite(amount) || amount < 0)
        return res.status(400).json({ message: "Hội viên hoặc số tiền không hợp lệ." });
    const row = await prisma_1.prisma.payment.create({ data: { branchId: member.branchId, memberId, amount, method: methodMap[String(b.method)] ?? "CASH", status: statusMap[String(b.status)] ?? "PAID", paidAt: b.date ? new Date(b.date) : new Date() }, include: { member: true } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.payments("all"));
    return res.status(201).json({ data: out(row) });
}
catch {
    return res.status(500).json({ message: "Không thể tạo giao dịch." });
} });
exports.paymentsRoutes.patch("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "payment.update");
    const b = req.body ?? {}, ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const existing = await prisma_1.prisma.payment.findFirst({ where: { id: String(b.id), ...(ids === null ? {} : { branchId: { in: ids } }) } });
    if (!existing)
        return res.status(404).json({ message: "Không tìm thấy giao dịch." });
    const row = await prisma_1.prisma.payment.update({ where: { id: existing.id }, data: { amount: Number(b.amount ?? existing.amount), method: methodMap[String(b.method)] ?? existing.method, status: statusMap[String(b.status)] ?? existing.status, paidAt: b.date ? new Date(b.date) : existing.paidAt }, include: { member: true } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.payments("all"));
    return res.json({ data: out(row) });
}
catch {
    return res.status(500).json({ message: "Không thể cập nhật giao dịch." });
} });
exports.paymentsRoutes.delete("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "payment.delete");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const existing = await prisma_1.prisma.payment.findFirst({ where: { id: String(req.body?.id), ...(ids === null ? {} : { branchId: { in: ids } }) } });
    if (!existing)
        return res.status(404).json({ message: "Không tìm thấy giao dịch." });
    await prisma_1.prisma.payment.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.payments("all"));
    return res.json({ message: "Đã hủy giao dịch." });
}
catch {
    return res.status(500).json({ message: "Không thể hủy giao dịch." });
} });
