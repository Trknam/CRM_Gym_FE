"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLimitations = parseLimitations;
exports.getActiveLimitationRules = getActiveLimitationRules;
exports.filterWorkoutExercises = filterWorkoutExercises;
exports.buildRuleSummary = buildRuleSummary;
// Các rule này là lớp an toàn trước AI. Nhiều vị trí có thể cùng lúc kích hoạt nhiều rule.
// Không dùng để chẩn đoán y khoa; mục tiêu là loại các bài có nguy cơ liên quan đến vùng đau.
const LIMITATION_RULES = [
    {
        id: "lower-back",
        label: "lưng",
        keys: ["dau lung", "lung", "that lung", "lumbar", "lower back", "back pain"],
        blocked: ["deadlift", "romanian deadlift", "dumbbell rdl", "good morning", "back squat", "barbell back squat", "barbell squat"],
    },
    {
        id: "knee",
        label: "gối",
        keys: ["dau goi", "goi", "knee", "knee pain"],
        blocked: ["squat", "leg press", "leg extension", "lunge", "jump", "running", "chay", "step up", "bulgarian split squat"],
    },
    {
        id: "foot-ankle",
        label: "bàn chân / cổ chân",
        keys: ["dau chan", "ban chan", "dau ban chan", "co chan", "ankle", "foot", "foot pain", "ankle pain"],
        blocked: ["running", "chay", "jump", "nhay", "calf raise", "walking lunge", "lunge", "step up", "bulgarian split squat", "treadmill"],
    },
    {
        id: "shoulder",
        label: "vai",
        keys: ["dau vai", "vai", "shoulder", "shoulder pain"],
        blocked: ["overhead press", "shoulder press", "upright row", "lateral raise", "reverse fly", "behind neck", "pull up"],
    },
    {
        id: "wrist",
        label: "cổ tay",
        keys: ["dau co tay", "co tay", "wrist", "wrist pain"],
        blocked: ["bench press", "push up", "barbell curl", "biceps curl", "hammer curl", "front squat", "plank"],
    },
    {
        id: "elbow",
        label: "khuỷu tay",
        keys: ["dau khuyu tay", "khuyu tay", "elbow", "elbow pain"],
        blocked: ["triceps extension", "skull crusher", "pushdown", "biceps curl", "barbell curl", "hammer curl", "close grip bench"],
    },
    {
        id: "hip",
        label: "hông",
        keys: ["dau hong", "hong", "hip", "hip pain"],
        blocked: ["deep squat", "squat", "lunge", "hip thrust", "step up", "bulgarian split squat"],
    },
    {
        id: "neck",
        label: "cổ",
        keys: ["dau co", "co", "cervical", "neck", "neck pain"],
        blocked: ["behind neck", "barbell back squat", "shrug", "upright row", "heavy deadlift"],
    },
];
function normalized(value) {
    return (value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
}
function parseLimitations(value) {
    const raw = Array.isArray(value) ? value : [value ?? ""];
    return raw
        .flatMap((item) => item.split(/[;,|]+/))
        .map((item) => item.trim())
        .filter(Boolean);
}
function matchesLevel(level, requested) {
    const e = normalized(level);
    const r = normalized(requested);
    if (r.includes("advanced"))
        return e.includes("advanced") || e.includes("intermediate");
    if (r.includes("intermediate"))
        return e.includes("beginner") || e.includes("intermediate");
    return e.includes("beginner") || e.includes("intermediate") || e.includes("all");
}
function matchesEquipment(equipment, requested) {
    const r = normalized(requested);
    const e = normalized(equipment);
    if (!r || r.includes("gym day du") || r.includes("full gym"))
        return true;
    if (r.includes("khong dung cu") || r.includes("bodyweight")) {
        return !e || e.includes("bodyweight") || e.includes("none") || e.includes("khong");
    }
    return r
        .split(/[,;]+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .some((keyword) => e.includes(keyword)) || !e;
}
function matchedLimitationIds(exercise, limitations) {
    const texts = parseLimitations(limitations).map(normalized);
    if (!texts.length)
        return [];
    const haystack = normalized(`${exercise.name} ${exercise.muscle} ${exercise.description ?? ""}`);
    return LIMITATION_RULES
        .filter((rule) => {
        const active = texts.some((text) => rule.keys.some((key) => text.includes(normalized(key))));
        return active && rule.blocked.some((key) => haystack.includes(normalized(key)));
    })
        .map((rule) => rule.id);
}
function getActiveLimitationRules(limitations) {
    const texts = parseLimitations(limitations).map(normalized);
    return LIMITATION_RULES.filter((rule) => texts.some((text) => rule.keys.some((key) => text.includes(normalized(key)))))
        .map(({ id, label }) => ({ id, label }));
}
function goalScore(exercise, goal) {
    const haystack = normalized(`${exercise.name} ${exercise.muscle} ${exercise.description ?? ""}`);
    const target = normalized(goal);
    if (target.includes("suc manh"))
        return /(strength|compound|squat|press|deadlift|row|pull|bench)/.test(haystack) ? 4 : 1;
    if (target.includes("tang co"))
        return /(chest|back|leg|shoulder|arm|glute|lat|quad|hamstring|muscle)/.test(haystack) ? 4 : 1;
    if (target.includes("giam can") || target.includes("giam mo") || target.includes("the luc"))
        return /(cardio|cycling|bike|walk|run|row|hiit)/.test(haystack) ? 4 : 2;
    return 2;
}
function filterWorkoutExercises(exercises, input) {
    const eligible = exercises.filter((exercise) => exercise.isActive &&
        matchesLevel(exercise.level, input.level) &&
        matchesEquipment(exercise.equipment, input.equipment) &&
        matchedLimitationIds(exercise, input.limitations).length === 0);
    return eligible.sort((a, b) => goalScore(b, input.goal) - goalScore(a, input.goal));
}
function buildRuleSummary(input, total) {
    const activeLimitations = getActiveLimitationRules(input.limitations);
    const warnings = [];
    if (activeLimitations.length) {
        warnings.push(`Đã áp dụng ${activeLimitations.length} nhóm hạn chế: ${activeLimitations.map((item) => item.label).join(", ")}.`);
    }
    if (input.limitations.trim()) {
        warnings.push("Các bài có nguy cơ liên quan đến hạn chế đã được loại khỏi danh sách AI.");
    }
    return { candidateCount: total, activeLimitations, warnings };
}
