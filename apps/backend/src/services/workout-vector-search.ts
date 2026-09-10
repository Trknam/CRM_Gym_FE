import { createHash, randomUUID } from "node:crypto";
import { Ollama } from "ollama";
import { prisma } from "../db/prisma";

type ExerciseVectorInput = {
  id: string;
  name: string;
  muscle: string;
  equipment: string | null;
  level: string;
  description: string | null;
};

type VectorRow = { exerciseId: string; contentHash: string };
export type RankedExercise = { id: string; similarity: number };

// Planner dùng Ollama Cloud; embedding chạy cục bộ bằng EmbeddingGemma nhỏ.
// Vector database vẫn nằm trong PostgreSQL thông qua pgvector.
const EMBEDDING_HOST = (process.env.WORKOUT_EMBEDDING_HOST ?? "http://workout-embeddings:11434").replace(/\/$/, "");
const EMBEDDING_MODEL = process.env.WORKOUT_EMBEDDING_MODEL ?? "embeddinggemma:300m-qat-q4_0";
const EMBEDDING_DIMENSIONS = Number(process.env.WORKOUT_EMBEDDING_DIMENSIONS ?? 768);
const ollamaEmbedding = new Ollama({ host: EMBEDDING_HOST });
const EMBEDDING_TIMEOUT_MS = Number(process.env.WORKOUT_EMBEDDING_TIMEOUT_MS ?? 2500);
let vectorIndexReady = false;

async function embedWithTimeout(input: string | string[]) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      ollamaEmbedding.embed({ model: EMBEDDING_MODEL, input }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("VECTOR_TIMEOUT")), EMBEDDING_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function contentFor(exercise: ExerciseVectorInput) {
  return [
    `Tên bài tập: ${exercise.name}`,
    `Nhóm cơ: ${exercise.muscle}`,
    `Thiết bị: ${exercise.equipment ?? "Không yêu cầu"}`,
    `Trình độ: ${exercise.level}`,
    `Mô tả: ${exercise.description ?? ""}`,
  ].join("\n");
}

function hashContent(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function vectorLiteral(vector: number[]) {
  if (vector.length !== EMBEDDING_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
    throw new Error("VECTOR_INVALID_DIMENSION");
  }
  return `[${vector.join(",")}]`;
}

async function ensureVectorIndex() {
  if (vectorIndexReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ExerciseEmbedding_embedding_hnsw_idx"
    ON "ExerciseEmbedding" USING hnsw ("embedding" vector_cosine_ops)
  `);
  vectorIndexReady = true;
}

async function getStoredHashes() {
  return prisma.$queryRaw<VectorRow[]>`
    SELECT "exerciseId", "contentHash"
    FROM "ExerciseEmbedding"
    WHERE "model" = ${EMBEDDING_MODEL}
  `;
}

async function upsertEmbeddings(exercises: ExerciseVectorInput[]) {
  if (!exercises.length) return;

  const stored = new Map((await getStoredHashes()).map((row) => [row.exerciseId, row.contentHash]));
  const missing = exercises.filter((exercise) => stored.get(exercise.id) !== hashContent(contentFor(exercise)));

  for (let start = 0; start < missing.length; start += 24) {
    const batch = missing.slice(start, start + 24);
    const response = await embedWithTimeout(batch.map(contentFor));

    if (!Array.isArray(response.embeddings) || response.embeddings.length !== batch.length) {
      throw new Error("VECTOR_INVALID_RESPONSE");
    }

    for (let index = 0; index < batch.length; index += 1) {
      const exercise = batch[index];
      const embedding = vectorLiteral(response.embeddings[index]);
      const hash = hashContent(contentFor(exercise));
      await prisma.$executeRaw`
        INSERT INTO "ExerciseEmbedding" ("id", "exerciseId", "model", "contentHash", "embedding", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${exercise.id}, ${EMBEDDING_MODEL}, ${hash}, ${embedding}::vector, NOW(), NOW())
        ON CONFLICT ("exerciseId") DO UPDATE SET
          "model" = EXCLUDED."model",
          "contentHash" = EXCLUDED."contentHash",
          "embedding" = EXCLUDED."embedding",
          "updatedAt" = NOW()
      `;
    }
  }
}

export async function rankExercisesByVector(
  exercises: ExerciseVectorInput[],
  query: string,
  limit = 24,
) {
  if (!exercises.length || !query.trim()) return [] as RankedExercise[];

  await ensureVectorIndex();
  await upsertEmbeddings(exercises);
  const response = await embedWithTimeout(query);
  const queryVector = vectorLiteral(response.embeddings?.[0] ?? []);
  const ids = exercises.map((exercise) => exercise.id);

  return prisma.$queryRawUnsafe<RankedExercise[]>(
    `
      SELECT "exerciseId" AS id,
             1 - ("embedding" <=> $1::vector) AS similarity
      FROM "ExerciseEmbedding"
      WHERE "model" = $2
        AND "exerciseId" = ANY($3::text[])
      ORDER BY "embedding" <=> $1::vector
      LIMIT $4
    `,
    queryVector,
    EMBEDDING_MODEL,
    ids,
    limit,
  );
}

export function buildWorkoutSemanticQuery(input: {
  goal: string;
  level: string;
  equipment: string;
  preferences: string;
  limitations: string;
}) {
  return [
    `Mục tiêu: ${input.goal}`,
    `Trình độ: ${input.level}`,
    `Thiết bị: ${input.equipment}`,
    `Sở thích: ${input.preferences || "Không có"}`,
    `Hạn chế cần tránh: ${input.limitations || "Không có"}`,
    "Tìm các bài tập gym phù hợp nhất với nhu cầu này.",
  ].join("\n");
}

export const workoutVectorConfig = {
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSIONS,
};
