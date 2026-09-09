import { Router } from "express";
import { prisma } from "../db/prisma";
import { cacheDelete, cacheGet, cacheSet } from "../cache/valkey";
import { cacheKeys } from "../cache/keys";
import { requirePermission } from "../auth/authorization";
import { defaultBranchId } from "../api/branches";

export const membersRoutes = Router();

function mapMember(member: any) {
  const membership = member.memberships?.[0];
  return {
    id: member.id,
    name: member.fullName,
    phone: member.phone,
    email: member.email ?? "",
    packageId: membership?.packageId ?? "",
    package: membership?.package?.name ?? "Chưa có gói",
    status: membership?.status === "ACTIVE" ? "Đang hoạt động" : membership?.status === "EXPIRED" ? "Hết hạn" : member.status === "ACTIVE" ? "Đang hoạt động" : "Tạm nghỉ",
    memberStatus: member.status === "ACTIVE" ? "Đang hoạt động" : member.status === "BLOCKED" ? "Bị khóa" : "Tạm nghỉ",
    membershipStatus: membership?.status === "ACTIVE" ? "Đang hoạt động" : membership?.status === "EXPIRED" ? "Hết hạn" : membership?.status === "CANCELLED" ? "Đã hủy" : "",
    startDate: membership?.startDate?.toISOString().slice(0, 10) ?? "",
    endDate: membership?.endDate?.toISOString().slice(0, 10) ?? "",
    expiry: membership?.endDate?.toISOString().slice(0, 10) ?? "",
  };
}

async function invalidate() {
  await cacheDelete(cacheKeys.members("all"));
}

membersRoutes.get("/", async (req, res) => {
  try {
    await requirePermission(req, "member.read");
    const branchId = await defaultBranchId(req);
    const key = cacheKeys.members(branchId);
    const cached = await cacheGet<unknown[]>(key);
    if (cached) return res.json({ data: cached, cached: true });
    const members = await prisma.member.findMany({
      where: { branchId },
      orderBy: { createdAt: "desc" },
      include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } },
    });
    const data = members.map(mapMember);
    await cacheSet(key, data, 60);
    return res.json({ data, cached: false });
  } catch (error) {
    console.error("[members] list failed", error);
    if (error instanceof Error && "status" in error) return res.status(Number((error as any).status)).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể lấy danh sách hội viên." });
  }
});

membersRoutes.post("/", async (req, res) => {
  try {
    await requirePermission(req, "member.create");
    const body = req.body ?? {};
    const branchId = await defaultBranchId(req);
    const fullName = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim() || null;
    if (!fullName || !phone) return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
    const duplicate = await prisma.member.findFirst({ where: { phone, branchId } });
    if (duplicate) return res.status(409).json({ message: "Số điện thoại hội viên đã tồn tại." });
    const count = await prisma.member.count({ where: { branchId } });
    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: { branchId, memberCode: `MB-${String(count + 1).padStart(5, "0")}`, fullName, phone, email, status: body.memberStatus === "BLOCKED" ? "BLOCKED" : "ACTIVE" },
      });
      const packageId = String(body.packageId ?? "").trim();
      if (packageId) {
        const pkg = await tx.gymPackage.findFirst({ where: { id: packageId, branchId, status: "ACTIVE" } });
        if (!pkg) throw new Error("INVALID_PACKAGE");
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + pkg.durationDays);
        await tx.membership.create({ data: { memberId: created.id, packageId: pkg.id, startDate, endDate, price: pkg.price, status: "ACTIVE" } });
      }
      return tx.member.findUniqueOrThrow({ where: { id: created.id }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } } });
    });
    await invalidate();
    return res.status(201).json({ data: mapMember(member) });
  } catch (error) {
    console.error("[members] create failed", error);
    if (error instanceof Error && "status" in error) return res.status(Number((error as any).status)).json({ message: (error as any).message });
    if (error instanceof Error && error.message === "INVALID_PACKAGE") return res.status(400).json({ message: "Gói tập không hợp lệ hoặc đã ngừng bán." });
    return res.status(500).json({ message: "Không thể tạo hội viên." });
  }
});

membersRoutes.patch("/", async (req, res) => {
  try {
    await requirePermission(req, "member.update");
    const body = req.body ?? {};
    const id = String(body.id ?? "").trim();
    const branchId = await defaultBranchId(req);
    if (!id) return res.status(400).json({ message: "Thiếu mã hội viên." });
    const existing = await prisma.member.findFirst({ where: { id, branchId }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1 } } });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy hội viên." });
    const fullName = String(body.name ?? existing.fullName).trim();
    const phone = String(body.phone ?? existing.phone).trim();
    if (!fullName || !phone) return res.status(400).json({ message: "Họ tên và số điện thoại là bắt buộc." });
    const duplicate = await prisma.member.findFirst({ where: { phone, branchId, id: { not: id } }, select: { id: true } });
    if (duplicate) return res.status(409).json({ message: "Số điện thoại hội viên đã tồn tại." });
    await prisma.member.update({ where: { id }, data: { fullName, phone, email: String(body.email ?? existing.email ?? "").trim() || null, status: body.memberStatus === "BLOCKED" ? "BLOCKED" : body.memberStatus === "INACTIVE" ? "INACTIVE" : body.memberStatus === "ACTIVE" ? "ACTIVE" : existing.status } });
    const packageId = String(body.packageId ?? "").trim();
    if (packageId && packageId !== existing.memberships[0]?.packageId) {
      const pkg = await prisma.gymPackage.findFirst({ where: { id: packageId, branchId, status: "ACTIVE" } });
      if (!pkg) return res.status(400).json({ message: "Gói tập không hợp lệ hoặc đã ngừng bán." });
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + pkg.durationDays);
      if (existing.memberships[0]) await prisma.membership.update({ where: { id: existing.memberships[0].id }, data: { packageId: pkg.id, startDate, endDate, price: pkg.price, status: "ACTIVE" } });
      else await prisma.membership.create({ data: { memberId: id, packageId: pkg.id, startDate, endDate, price: pkg.price, status: "ACTIVE" } });
    }
    const updated = await prisma.member.findUniqueOrThrow({ where: { id }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } } });
    await invalidate();
    return res.json({ data: mapMember(updated) });
  } catch (error) {
    console.error("[members] update failed", error);
    if (error instanceof Error && "status" in error) return res.status(Number((error as any).status)).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể cập nhật hội viên." });
  }
});

membersRoutes.delete("/", async (req, res) => {
  try {
    await requirePermission(req, "member.delete");
    const id = String(req.body?.id ?? "").trim();
    const branchId = await defaultBranchId(req);
    const existing = await prisma.member.findFirst({ where: { id, branchId }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy hội viên." });
    await prisma.member.update({ where: { id }, data: { status: "INACTIVE" } });
    await invalidate();
    return res.json({ message: "Đã ngừng hoạt động hội viên." });
  } catch (error) {
    console.error("[members] delete failed", error);
    if (error instanceof Error && "status" in error) return res.status(Number((error as any).status)).json({ message: (error as any).message });
    return res.status(500).json({ message: "Không thể xóa hội viên." });
  }
});
