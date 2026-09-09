"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exercisesRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
const valkey_1 = require("../cache/valkey");
const keys_1 = require("../cache/keys");
const out = (x) => ({ id: x.id, name: x.name, muscle: x.muscle, equipment: x.equipment ?? "", level: x.level, description: x.description ?? "" });
exports.exercisesRoutes = (0, express_1.Router)();
exports.exercisesRoutes.get("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "exercise.read");
    const key = keys_1.cacheKeys.exercises();
    const cached = await (0, valkey_1.cacheGet)(key);
    if (cached)
        return res.json({ data: cached, cached: true });
    const rows = await prisma_1.prisma.exercise.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    const data = rows.map(out);
    await (0, valkey_1.cacheSet)(key, data, 300);
    return res.json({ data, cached: false });
}
catch (error) {
    const status = error?.status;
    if (status)
        return res.status(status).json({ message: error.message });
    return res.status(500).json({ message: "Không thể lấy kho bài tập." });
} });
exports.exercisesRoutes.post("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "exercise.create");
    const b = req.body ?? {}, name = String(b.name ?? "").trim(), muscle = String(b.muscle ?? "").trim();
    if (!name || !muscle)
        return res.status(400).json({ message: "Tên bài tập và nhóm cơ là bắt buộc." });
    const row = await prisma_1.prisma.exercise.create({ data: { name, muscle, equipment: String(b.equipment ?? "").trim() || null, level: String(b.level ?? "Beginner").trim() || "Beginner", description: String(b.description ?? "").trim() || null } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.exercises());
    return res.status(201).json({ data: out(row) });
}
catch (error) {
    const status = error?.status;
    if (status)
        return res.status(status).json({ message: error.message });
    return res.status(500).json({ message: "Không thể tạo bài tập." });
} });
exports.exercisesRoutes.patch("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "exercise.update");
    const b = req.body ?? {}, id = String(b.id ?? ""), name = String(b.name ?? "").trim(), muscle = String(b.muscle ?? "").trim();
    if (!id || !name || !muscle)
        return res.status(400).json({ message: "Tên bài tập và nhóm cơ là bắt buộc." });
    const row = await prisma_1.prisma.exercise.update({ where: { id }, data: { name, muscle, equipment: String(b.equipment ?? "").trim() || null, level: String(b.level ?? "Beginner").trim() || "Beginner", description: String(b.description ?? "").trim() || null } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.exercises());
    return res.json({ data: out(row) });
}
catch (error) {
    const status = error?.status;
    if (status)
        return res.status(status).json({ message: error.message });
    return res.status(500).json({ message: "Không thể cập nhật bài tập." });
} });
exports.exercisesRoutes.delete("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "exercise.delete");
    await prisma_1.prisma.exercise.update({ where: { id: String(req.body?.id) }, data: { isActive: false } });
    await (0, valkey_1.cacheDelete)(keys_1.cacheKeys.exercises());
    return res.json({ message: "Đã xóa bài tập." });
}
catch (error) {
    const status = error?.status;
    if (status)
        return res.status(status).json({ message: error.message });
    return res.status(500).json({ message: "Không thể xóa bài tập." });
} });
