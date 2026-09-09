"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workoutsRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const authorization_1 = require("../auth/authorization");
const workout_rules_1 = require("../services/workout-rules");
exports.workoutsRoutes = (0, express_1.Router)();
const OLLAMA_URL = (process.env.OLLAMA_URL ?? "http://host.docker.internal:11434").replace(/\/$/, "");
const MODEL = process.env.WORKOUT_AI_MODEL ?? "qwen2.5:7b";
const text = (v, d = "") => String(v ?? d).trim();
const num = (v, d = 0) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : d;
const positiveInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;
const scope = async (req) => { const ids = await (0, authorization_1.getAccessibleBranchIds)(req); return ids === null ? {} : { branchId: { in: ids } }; };
exports.workoutsRoutes.get("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "workout.read");
    const plans = await prisma_1.prisma.workoutPlan.findMany({ where: { ...(await scope(req)), ...(req.query.memberId ? { memberId: String(req.query.memberId) } : {}) }, orderBy: { createdAt: "desc" }, take: 20, include: { member: { select: { id: true, fullName: true } }, days: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: true } } } } } });
    return res.json({ data: plans });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    return res.status(500).json({ message: "Không thể lấy lịch sử workout." });
} });
exports.workoutsRoutes.post("/", async (req, res) => {
    try {
        const user = await (0, authorization_1.requirePermission)(req, "workout.generate");
        const b = req.body ?? {}, memberId = text(b.memberId), goal = text(b.goal);
        const sessions = num(b.sessionsPerWeek, 3), duration = num(b.durationMinutes, 60), level = text(b.level, "Beginner"), equipment = text(b.equipment, "Gym đầy đủ thiết bị"), preferences = text(b.preferences), limitations = text(b.limitations);
        if (!memberId || !goal)
            return res.status(400).json({ message: "Hội viên và mục tiêu là bắt buộc." });
        if (sessions < 1 || sessions > 7)
            return res.status(400).json({ message: "Số buổi/tuần phải từ 1 đến 7." });
        if (duration < 20 || duration > 180)
            return res.status(400).json({ message: "Thời lượng mỗi buổi phải từ 20 đến 180 phút." });
        const member = await prisma_1.prisma.member.findFirst({ where: { id: memberId, ...(await scope(req)) }, select: { id: true, branchId: true, fullName: true, status: true, dateOfBirth: true } });
        if (!member)
            return res.status(404).json({ message: "Không tìm thấy hội viên trong phạm vi chi nhánh." });
        const exercises = await prisma_1.prisma.exercise.findMany({ where: { isActive: true } });
        const usable = (0, workout_rules_1.filterWorkoutExercises)(exercises, { goal, level, equipment, limitations, preferences });
        const rules = (0, workout_rules_1.buildRuleSummary)({ goal, level, equipment, limitations, preferences }, usable.length);
        if (usable.length < 4)
            return res.status(422).json({ message: `Rule Engine chỉ tìm được ${usable.length} bài tập phù hợp. Cần ít nhất 4 bài.` });
        const catalog = usable.slice(0, 80).map((e) => ({ id: e.id, name: e.name, muscle: e.muscle, equipment: e.equipment, level: e.level, description: e.description }));
        const prompt = `Bạn là AI Workout Planner. Chỉ dùng exerciseId trong catalog. Tạo đúng ${sessions} ngày, mỗi ngày 2-6 bài. JSON duy nhất theo schema: {summary,rationale,safetyNote,days:[{title,focus,exercises:[{exerciseId,sets,reps,durationMinutes,restSeconds,note}]}]}. Mục tiêu=${goal}; trình độ=${level}; thời lượng=${duration}; thiết bị=${equipment}; sở thích=${preferences}; hạn chế=${limitations}. RuleEngine=${JSON.stringify(rules)}. Catalog=${JSON.stringify(catalog)}`;
        let ai;
        try {
            ai = await fetch(`${OLLAMA_URL}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: MODEL, stream: false, messages: [{ role: "system", content: "Trả về JSON hợp lệ, không markdown." }, { role: "user", content: prompt }], format: "json", options: { temperature: 0.2 } }) });
        }
        catch {
            throw new Error("AI_UNAVAILABLE");
        }
        const payload = await ai.json().catch(() => ({}));
        if (!ai.ok)
            throw new Error("AI_UNAVAILABLE");
        let data;
        try {
            data = JSON.parse(payload.message?.content ?? "");
        }
        catch {
            throw new Error("AI_INVALID_JSON");
        }
        ;
        if (!Array.isArray(data.days) || data.days.length !== sessions)
            throw new Error("AI_INVALID_DAYS");
        const allowed = new Set(catalog.map((e) => e.id));
        if (data.days.some((d) => !Array.isArray(d.exercises) || d.exercises.length < 2 || d.exercises.length > 6 || d.exercises.some((x) => !allowed.has(x.exerciseId) || !positiveInt(x.sets) || Number(x.sets) > 6 || (!positiveInt(x.reps) && !positiveInt(x.durationMinutes)) || Number(x.restSeconds ?? 60) < 0 || Number(x.restSeconds ?? 60) > 300)))
            throw new Error("AI_INVALID_EXERCISE");
        const names = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
        const plan = await prisma_1.prisma.$transaction(async (tx) => { const p = await tx.workoutPlan.create({ data: { branchId: member.branchId, memberId: member.id, createdById: user.id, goal, level, sessionsPerWeek: sessions, durationMinutes: duration, equipment, preferences: preferences || null, notes: text(data.safetyNote) || null, aiModel: MODEL } }); for (let i = 0; i < data.days.length; i++) {
            const d = await tx.workoutDay.create({ data: { workoutPlanId: p.id, dayNumber: i + 1, dayName: names[i], title: text(data.days[i].title), focus: text(data.days[i].focus) } });
            await tx.workoutExercise.createMany({ data: data.days[i].exercises.map((x, j) => ({ workoutDayId: d.id, exerciseId: x.exerciseId, sortOrder: j + 1, sets: num(x.sets), reps: num(x.reps), durationMinutes: num(x.durationMinutes), restSeconds: num(x.restSeconds, 60), note: text(x.note) || null })) });
        } return tx.workoutPlan.findUniqueOrThrow({ where: { id: p.id }, include: { member: { select: { id: true, fullName: true } }, days: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: true } } } } } }); });
        return res.status(201).json({ data: { plan, summary: text(data.summary), rationale: text(data.rationale), safetyNote: text(data.safetyNote), exerciseCount: plan.days.reduce((n, d) => n + d.exercises.length, 0) } });
    }
    catch (e) {
        const m = e instanceof Error ? e.message : "";
        if (m === "AI_UNAVAILABLE")
            return res.status(503).json({ message: `AI local chưa sẵn sàng. Hãy mở Ollama và kiểm tra model ${MODEL}.` });
        if (m === "AI_INVALID_JSON" || m === "AI_INVALID_DAYS" || m === "AI_INVALID_EXERCISE")
            return res.status(502).json({ message: "AI trả về kế hoạch không hợp lệ; kế hoạch không được lưu." });
        return res.status(500).json({ message: "Không thể tạo workout bằng AI." });
    }
});
