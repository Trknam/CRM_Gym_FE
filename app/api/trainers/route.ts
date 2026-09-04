import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAccessibleBranchIds, requirePermission } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";

function toTrainerResponse(user: {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  trainerProfile: { specialty: string | null } | null;
}) {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email ?? "",
    phone: user.phone ?? "",
    specialty: user.trainerProfile?.specialty ?? "",
    status: user.isActive ? "Đang hoạt động" : "Tạm nghỉ",
  };
}

async function getBranchFilter() {
  const branchIds = await getAccessibleBranchIds();
  return branchIds === null ? {} : { userBranches: { some: { branchId: { in: branchIds } } } };
}

export async function GET() {
  try {
    await requirePermission("trainer.read");
    const branchFilter = await getBranchFilter();

    const trainers = await prisma.user.findMany({
      where: { role: "TRAINER", ...branchFilter },
      orderBy: { createdAt: "desc" },
      include: { trainerProfile: true },
    });

    return NextResponse.json({ data: trainers.map(toTrainerResponse) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ message: "Không thể lấy danh sách PT / Trainer." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await requirePermission("trainer.create");
    const branchIds = await getAccessibleBranchIds();
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const specialty = String(body.specialty ?? "").trim();
    const password = String(body.password ?? "");
    const branchId = String(body.branchId ?? "").trim();

    if (!name || !phone || !email || password.length < 8) {
      return NextResponse.json({ message: "Họ tên, email, số điện thoại và mật khẩu ít nhất 8 ký tự là bắt buộc." }, { status: 400 });
    }

    const targetBranchId = branchIds === null
      ? branchId || (await prisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } }))?.id
      : branchIds[0];

    if (!targetBranchId) {
      return NextResponse.json({ message: "Chưa có chi nhánh hoạt động để gán Trainer." }, { status: 400 });
    }

    if (branchIds !== null && !branchIds.includes(targetBranchId)) {
      return NextResponse.json({ message: "Bạn không có quyền tạo Trainer tại chi nhánh này." }, { status: 403 });
    }

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ message: "Email hoặc số điện thoại đã tồn tại." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const trainer = await prisma.user.create({
      data: {
        fullName: name,
        email,
        phone,
        passwordHash,
        role: "TRAINER",
        isActive: true,
        userBranches: { create: { branchId: targetBranchId } },
        trainerProfile: { create: { specialty: specialty || null } },
      },
      include: { trainerProfile: true },
    });

    return NextResponse.json({ data: toTrainerResponse(trainer) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ message: "Không thể tạo PT / Trainer." }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await requirePermission("trainer.update");
    const branchIds = await getAccessibleBranchIds();
    const body = await request.json();
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ message: "Thiếu ID Trainer." }, { status: 400 });

    const trainer = await prisma.user.findFirst({
      where: { id, role: "TRAINER", ...(branchIds === null ? {} : { userBranches: { some: { branchId: { in: branchIds } } } }) },
      select: { id: true },
    });
    if (!trainer) return NextResponse.json({ message: "Không tìm thấy Trainer hoặc bạn không có quyền." }, { status: 404 });

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ message: "Đã ngừng hoạt động Trainer." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ message: "Không thể xóa PT / Trainer." }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePermission("trainer.update");
    const branchIds = await getAccessibleBranchIds();
    const body = await request.json();
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ message: "Thiếu ID Trainer." }, { status: 400 });

    const trainer = await prisma.user.findFirst({
      where: { id, role: "TRAINER", ...(branchIds === null ? {} : { userBranches: { some: { branchId: { in: branchIds } } } }) },
      include: { trainerProfile: true },
    });
    if (!trainer) return NextResponse.json({ message: "Không tìm thấy Trainer hoặc bạn không có quyền." }, { status: 404 });

    const name = String(body.name ?? trainer.fullName).trim();
    const phone = String(body.phone ?? trainer.phone ?? "").trim();
    const email = String(body.email ?? trainer.email ?? "").trim().toLowerCase();
    const specialty = String(body.specialty ?? trainer.trainerProfile?.specialty ?? "").trim();
    const isActive = body.status === undefined ? trainer.isActive : body.status === "Đang hoạt động";

    const duplicate = await prisma.user.findFirst({ where: { id: { not: id }, OR: [{ email }, { phone }] }, select: { id: true } });
    if (duplicate) return NextResponse.json({ message: "Email hoặc số điện thoại đã được sử dụng." }, { status: 409 });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        fullName: name,
        email,
        phone,
        isActive,
        trainerProfile: { upsert: { create: { specialty: specialty || null }, update: { specialty: specialty || null } } },
      },
      include: { trainerProfile: true },
    });

    return NextResponse.json({ data: toTrainerResponse(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ message: "Không thể cập nhật PT / Trainer." }, { status });
  }
}
