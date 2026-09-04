import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorization";
import { accessibleBranchWhere, defaultBranchId } from "@/lib/api/branches";
import { apiErrorFromUnknown } from "@/lib/api/response";

function response(member: any) {
  const membership = member.memberships?.[0];
  const memberStatus = member.status === "ACTIVE" ? "Đang hoạt động" : member.status === "BLOCKED" ? "Bị khóa" : "Tạm nghỉ";
  const membershipStatus = membership?.status === "ACTIVE" ? "Đang hoạt động" : membership?.status === "EXPIRED" ? "Hết hạn" : membership?.status === "CANCELLED" ? "Đã hủy" : "";
  return {
    id: member.id, name: member.fullName, phone: member.phone, email: member.email ?? "", packageId: membership?.packageId ?? "",
    package: membership?.package?.name ?? "Chưa có gói", status: membership?.status === "ACTIVE" ? "Đang hoạt động" : membership?.status === "EXPIRED" ? "Hết hạn" : member.status === "ACTIVE" ? "Đang hoạt động" : "Tạm nghỉ",
    memberStatus, membershipStatus,
    startDate: membership?.startDate ? membership.startDate.toISOString().slice(0, 10) : "",
    endDate: membership?.endDate ? membership.endDate.toISOString().slice(0, 10) : "",
    expiry: membership?.endDate ? membership.endDate.toISOString().slice(0, 10) : "",
  };
}

function memberStatusValue(value: unknown, fallback: "ACTIVE" | "INACTIVE" | "BLOCKED") {
  const status = String(value ?? "").trim();
  if (!status) return fallback;
  if (status === "Đang hoạt động" || status === "ACTIVE") return "ACTIVE" as const;
  if (status === "Tạm nghỉ" || status === "INACTIVE") return "INACTIVE" as const;
  if (status === "Bị khóa" || status === "BLOCKED") return "BLOCKED" as const;
  throw new Error("INVALID_MEMBER_STATUS");
}

function membershipStatusValue(value: unknown, fallback: "ACTIVE" | "EXPIRED" | "CANCELLED") {
  const status = String(value ?? "").trim();
  if (!status) return fallback;
  if (status === "Đang hoạt động" || status === "ACTIVE") return "ACTIVE" as const;
  if (status === "Hết hạn" || status === "EXPIRED") return "EXPIRED" as const;
  if (status === "Đã hủy" || status === "CANCELLED") return "CANCELLED" as const;
  throw new Error("INVALID_MEMBERSHIP_STATUS");
}

function parseDate(value: unknown, field: string) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const date = new Date(`${String(value).trim()}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`INVALID_${field.toUpperCase()}`);
  return date;
}

export async function GET() {
  try {
    await requirePermission("member.read");
    const where = await accessibleBranchWhere();
    const members = await prisma.member.findMany({ where, orderBy: { createdAt: "desc" }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } } });
    return NextResponse.json({ data: members.map(response) });
  } catch (error) { return apiErrorFromUnknown(error, "Không thể lấy danh sách hội viên."); }
}

export async function POST(request: Request) {
  try {
    await requirePermission("member.create");
    const body = await request.json();
    const branchId = String(body.branchId ?? await defaultBranchId()).trim();
    const fullName = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim() || null;
    if (!branchId || !fullName || !phone) return NextResponse.json({ message: "Chi nhánh, họ tên và số điện thoại là bắt buộc." }, { status: 400 });
    const duplicate = await prisma.member.findFirst({ where: { phone, branchId } });
    if (duplicate) return NextResponse.json({ message: "Số điện thoại hội viên đã tồn tại." }, { status: 409 });
    const count = await prisma.member.count({ where: { branchId } });
    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.member.create({ data: { branchId, memberCode: `MB-${String(count + 1).padStart(5, "0")}`, fullName, phone, email, status: memberStatusValue(body.memberStatus, "ACTIVE") } });
      const packageId = String(body.packageId ?? "").trim();
      if (packageId) {
        const pkg = await tx.gymPackage.findFirst({ where: { id: packageId, branchId, status: "ACTIVE" } });
        if (!pkg) throw new Error("INVALID_PACKAGE");
        const startDate = new Date();
        const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + pkg.durationDays);
        await tx.membership.create({ data: { memberId: created.id, packageId: pkg.id, startDate, endDate, price: pkg.price, status: "ACTIVE" } });
      }
      return tx.member.findUniqueOrThrow({ where: { id: created.id }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } } });
    });
    return NextResponse.json({ data: response(member) }, { status: 201 });
  } catch (error) { return apiErrorFromUnknown(error, "Không thể tạo hội viên."); }
}

export async function PATCH(request: Request) {
  try {
    await requirePermission("member.update");
    const body = await request.json(); const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ message: "Thiếu ID hội viên." }, { status: 400 });
    const scope = await accessibleBranchWhere();
    const existing = await prisma.member.findFirst({ where: { id, ...scope } });
    if (!existing) return NextResponse.json({ message: "Không tìm thấy hội viên." }, { status: 404 });
    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.member.update({ where: { id }, data: { fullName: String(body.name ?? existing.fullName).trim(), phone: String(body.phone ?? existing.phone).trim(), email: String(body.email ?? existing.email ?? "").trim() || null, status: memberStatusValue(body.memberStatus, existing.status) } });
      if (body.packageId !== undefined) {
        const packageId = String(body.packageId ?? "").trim();
        if (packageId) {
          const pkg = await tx.gymPackage.findFirst({ where: { id: packageId, branchId: existing.branchId, status: "ACTIVE" } });
          if (!pkg) throw new Error("INVALID_PACKAGE");
          const current = await tx.membership.findFirst({ where: { memberId: id }, orderBy: { endDate: "desc" } });
          const suppliedStart = parseDate(body.startDate, "start_date");
          const suppliedEnd = parseDate(body.endDate, "end_date");
          const startDate = suppliedStart ?? (current?.status === "ACTIVE" && current.endDate > new Date() ? current.startDate : new Date());
          const endDate = suppliedEnd ?? new Date(startDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
          if (endDate <= startDate) throw new Error("INVALID_DATE_RANGE");
          const membershipStatus = membershipStatusValue(body.membershipStatus, current?.status ?? "ACTIVE");
          if (current) await tx.membership.update({ where: { id: current.id }, data: { packageId: pkg.id, startDate, endDate, price: pkg.price, status: membershipStatus } });
          else await tx.membership.create({ data: { memberId: id, packageId: pkg.id, startDate, endDate, price: pkg.price, status: membershipStatus } });
        } else if (body.membershipStatus !== undefined || body.startDate !== undefined || body.endDate !== undefined) {
          throw new Error("MEMBERSHIP_REQUIRED");
        }
      } else if (body.membershipStatus !== undefined || body.startDate !== undefined || body.endDate !== undefined) {
        const current = await tx.membership.findFirst({ where: { memberId: id }, orderBy: { endDate: "desc" } });
        if (!current) throw new Error("MEMBERSHIP_REQUIRED");
        const startDate = parseDate(body.startDate, "start_date") ?? current.startDate;
        const endDate = parseDate(body.endDate, "end_date") ?? current.endDate;
        if (endDate <= startDate) throw new Error("INVALID_DATE_RANGE");
        await tx.membership.update({ where: { id: current.id }, data: { startDate, endDate, status: membershipStatusValue(body.membershipStatus, current.status) } });
      }
      return tx.member.findUniqueOrThrow({ where: { id: updated.id }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } } });
    });
    return NextResponse.json({ data: response(member) });
  } catch (error) { return apiErrorFromUnknown(error, "Không thể cập nhật hội viên."); }
}

export async function DELETE(request: Request) {
  try {
    await requirePermission("member.delete"); const body = await request.json(); const id = String(body.id ?? "").trim(); const scope = await accessibleBranchWhere();
    const existing = await prisma.member.findFirst({ where: { id, ...scope }, select: { id: true } });
    if (!existing) return NextResponse.json({ message: "Không tìm thấy hội viên." }, { status: 404 });
    await prisma.member.update({ where: { id }, data: { status: "INACTIVE" } });
    return NextResponse.json({ message: "Đã ngừng hoạt động hội viên." });
  } catch (error) { return apiErrorFromUnknown(error, "Không thể xóa hội viên."); }
}
