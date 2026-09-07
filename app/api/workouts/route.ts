import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorization";
import { accessibleBranchWhere } from "@/lib/api/branches";
import { apiErrorFromUnknown } from "@/lib/api/response";
import { buildRuleSummary, filterWorkoutExercises } from "@/lib/workout/workout-rules";

const AI_PROVIDER = process.env.WORKOUT_AI_PROVIDER || "ollama";
const MODEL = process.env.WORKOUT_AI_MODEL || "qwen2.5:7b";
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://host.docker.internal:11434").replace(/\/$/, "");

const workoutSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    rationale: { type: "string" },
    safetyNote: { type: "string" },
    days: {
      type: "array",
      minItems: 1,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          focus: { type: "string" },
          exercises: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                exerciseId: { type: "string" },
                sets: { type: "integer", minimum: 0, maximum: 10 },
                reps: { type: "integer", minimum: 0, maximum: 50 },
                durationMinutes: { type: "integer", minimum: 0, maximum: 90 },
                restSeconds: { type: "integer", minimum: 0, maximum: 300 },
                note: { type: "string" },
              },
              required: ["exerciseId", "sets", "reps", "durationMinutes", "restSeconds", "note"],
            },
          },
        },
        required: ["title", "focus", "exercises"],
      },
    },
  },
  required: ["summary", "rationale", "safetyNote", "days"],
} as const;

function text(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function number(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

async function callAI(input: string) {
  const instructions = [
    "Bạn là AI Workout Planner cho hệ thống quản lý phòng gym.",
    "Chỉ được chọn exerciseId xuất hiện trong danh sách Exercise Database được cung cấp.",
    "Không được tự bịa tên hoặc ID bài tập.",
    "Thiết kế kế hoạch thực tế, cân bằng nhóm cơ, khối lượng và thời lượng.",
    "Nếu mục tiêu là cardio/giảm mỡ, có thể dùng bài có durationMinutes > 0; bài sức mạnh dùng sets/reps.",
    "Nếu người dùng có hạn chế/chấn thương được ghi rõ, tránh bài liên quan và ghi cảnh báo phù hợp; không chẩn đoán bệnh.",
    "Số ngày trong output phải đúng sessionsPerWeek.",
  ].join("\n");

  if (AI_PROVIDER === "ollama") {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input },
        ],
        format: workoutSchema,
        options: { temperature: 0.2 },
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`OLLAMA_API_ERROR:${text(payload?.error, "Ollama request failed")}`);
    if (!payload.message?.content) throw new Error("AI_EMPTY_RESPONSE");
    return { data: JSON.parse(payload.message.content), responseId: undefined };
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY_MISSING");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      store: false,
      instructions,
      input,
      text: { format: { type: "json_schema", name: "workout_plan", strict: true, schema: workoutSchema } },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const detail = text(payload?.error?.message, "OpenAI API request failed");
    throw new Error(`OPENAI_API_ERROR:${detail}`);
  }
  if (!payload.output_text) throw new Error("OPENAI_EMPTY_RESPONSE");
  return { data: JSON.parse(payload.output_text), responseId: payload.id as string | undefined };
}

export async function GET(request: Request) {
  try {
    await requirePermission("workout.read");
    const scope = await accessibleBranchWhere();
    const memberId = new URL(request.url).searchParams.get("memberId")?.trim();
    const plans = await prisma.workoutPlan.findMany({
      where: { ...scope, ...(memberId ? { memberId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        member: { select: { id: true, fullName: true } },
        days: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: true } } } },
      },
    });
    return NextResponse.json({ data: plans });
  } catch (error) {
    return apiErrorFromUnknown(error, "Không thể lấy lịch sử workout.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("workout.generate");
    const body = await request.json();
    const memberId = text(body.memberId);
    const goal = text(body.goal);
    const level = text(body.level, "Beginner");
    const sessionsPerWeek = number(body.sessionsPerWeek, 3);
    const durationMinutes = number(body.durationMinutes, 60);
    const equipment = text(body.equipment, "Gym đầy đủ thiết bị");
    const preferences = text(body.preferences);
    const limitations = text(body.limitations);

    if (!memberId || !goal) return NextResponse.json({ message: "Hội viên và mục tiêu là bắt buộc." }, { status: 400 });
    if (sessionsPerWeek < 1 || sessionsPerWeek > 7) return NextResponse.json({ message: "Số buổi/tuần phải từ 1 đến 7." }, { status: 400 });
    if (durationMinutes < 20 || durationMinutes > 180) return NextResponse.json({ message: "Thời lượng mỗi buổi phải từ 20 đến 180 phút." }, { status: 400 });

    const scope = await accessibleBranchWhere();
    const member = await prisma.member.findFirst({ where: { id: memberId, ...scope }, select: { id: true, branchId: true, fullName: true, dateOfBirth: true, status: true } });
    if (!member) return NextResponse.json({ message: "Không tìm thấy hội viên trong phạm vi chi nhánh của tài khoản." }, { status: 404 });

    const exercises = await prisma.exercise.findMany({ where: { isActive: true } });
    const usable = filterWorkoutExercises(exercises, { goal, level, equipment, limitations, preferences });
    const ruleSummary = buildRuleSummary({ goal, level, equipment, limitations, preferences }, usable.length);
    const minimumExercises = Math.max(4, Math.min(8, sessionsPerWeek + 1));
    if (usable.length < minimumExercises) return NextResponse.json({ message: `Rule Engine chỉ tìm được ${usable.length} bài tập phù hợp. Cần ít nhất ${minimumExercises} bài trong Exercise Database để AI tạo lịch an toàn.` }, { status: 422 });

    const exerciseCatalog = usable.slice(0, 120).map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      muscle: exercise.muscle,
      equipment: exercise.equipment,
      level: exercise.level,
      description: exercise.description,
    }));

    const aiInput = JSON.stringify({
      member: { name: member.fullName, status: member.status, dateOfBirth: member.dateOfBirth?.toISOString().slice(0, 10) ?? null },
      request: { goal, level, sessionsPerWeek, durationMinutes, equipment, preferences, limitations },
      ruleEngine: ruleSummary,
      exerciseDatabase: exerciseCatalog,
    });

    const { data, responseId } = await callAI(aiInput);
    if (!Array.isArray(data.days) || data.days.length !== sessionsPerWeek) throw new Error("AI_INVALID_DAY_COUNT");

    const candidateIds = new Set(exerciseCatalog.map((exercise) => exercise.id));
    const usedIds = new Set<string>();
    for (const day of data.days) {
      if (!Array.isArray(day.exercises) || day.exercises.length === 0) throw new Error("AI_EMPTY_DAY");
      for (const item of day.exercises) {
        if (!candidateIds.has(item.exerciseId)) throw new Error("AI_INVALID_EXERCISE_ID");
        usedIds.add(item.exerciseId);
      }
    }

    const weekdayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.workoutPlan.create({
        data: {
          branchId: member.branchId,
          memberId: member.id,
          createdById: user.id,
          goal,
          level,
          sessionsPerWeek,
          durationMinutes,
          equipment,
          preferences: preferences || null,
          notes: text(data.safetyNote) || null,
          aiModel: MODEL,
          aiResponseId: responseId ?? null,
        },
      });

      for (let index = 0; index < data.days.length; index += 1) {
        const day = data.days[index];
        const createdDay = await tx.workoutDay.create({
          data: { workoutPlanId: created.id, dayNumber: index + 1, dayName: weekdayNames[index], title: text(day.title), focus: text(day.focus) },
        });
        await tx.workoutExercise.createMany({
          data: day.exercises.map((item: any, itemIndex: number) => ({
            workoutDayId: createdDay.id,
            exerciseId: item.exerciseId,
            sortOrder: itemIndex + 1,
            sets: number(item.sets),
            reps: number(item.reps),
            durationMinutes: number(item.durationMinutes),
            restSeconds: number(item.restSeconds, 60),
            note: text(item.note) || null,
          })),
        });
      }
      return tx.workoutPlan.findUniqueOrThrow({
        where: { id: created.id },
        include: { member: { select: { id: true, fullName: true } }, days: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: true } } } } },
      });
    });

    return NextResponse.json({ data: { plan, summary: text(data.summary), rationale: text(data.rationale), safetyNote: text(data.safetyNote), exerciseCount: usedIds.size } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (message === "OPENAI_API_KEY_MISSING") return NextResponse.json({ message: "Chưa cấu hình OPENAI_API_KEY cho AI cloud." }, { status: 503 });
    if (message.startsWith("OLLAMA_API_ERROR:")) return NextResponse.json({ message: `AI local chưa sẵn sàng: ${message.replace("OLLAMA_API_ERROR:", "")}. Hãy mở Ollama và kiểm tra model ${MODEL}.` }, { status: 503 });
    if (message.startsWith("OPENAI_API_ERROR:")) return NextResponse.json({ message: message.replace("OPENAI_API_ERROR:", "AI không tạo được kế hoạch: ") }, { status: 502 });
    if (message === "AI_INVALID_DAY_COUNT") return NextResponse.json({ message: "AI trả về số buổi không đúng yêu cầu. Vui lòng thử lại." }, { status: 502 });
    if (message === "AI_INVALID_EXERCISE_ID") return NextResponse.json({ message: "AI trả về bài tập không có trong Exercise Database. Kế hoạch không được lưu." }, { status: 502 });
    return apiErrorFromUnknown(error, "Không thể tạo workout bằng AI.");
  }
}