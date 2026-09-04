import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, getAccessibleBranchIds } from "@/lib/auth/authorization";
import { apiErrorFromUnknown } from "@/lib/api/response";

export async function GET() {
  try {
    await requirePermission("report.read");
    const ids = await getAccessibleBranchIds();
    const branchWhere = ids === null ? {} : { branchId: { in: ids } };
    const [members, activeMemberships, payments, checkIns, leads, paidPayments] = await Promise.all([
      prisma.member.count({ where: branchWhere }),
      prisma.membership.count({ where: { status: "ACTIVE", member: branchWhere } }),
      prisma.payment.aggregate({ where: { ...branchWhere, status: "PAID" }, _sum: { amount: true } }),
      prisma.checkIn.count({ where: { ...branchWhere, status: "VALID" } }),
      prisma.lead.count({ where: branchWhere }),
      prisma.payment.count({ where: { ...branchWhere, status: "PAID" } }),
    ]);
    const data = [
      { id: "revenue", name: "Doanh thu", type: "Doanh thu", period: "Tất cả thời gian", status: `${Number(payments._sum.amount ?? 0).toLocaleString("vi-VN")} VNĐ` },
      { id: "members", name: "Hội viên", type: "Hội viên", period: "Hiện tại", status: `${members} hội viên / ${activeMemberships} membership active` },
      { id: "checkins", name: "Check-in", type: "Check-in", period: "Tất cả thời gian", status: `${checkIns} lượt hợp lệ` },
      { id: "leads", name: "Leads", type: "Leads", period: "Hiện tại", status: `${leads} Lead / ${paidPayments} giao dịch đã thanh toán` },
    ];
    return NextResponse.json({ data });
  } catch (e) { return apiErrorFromUnknown(e, "Không thể tạo báo cáo từ dữ liệu PostgreSQL."); }
}