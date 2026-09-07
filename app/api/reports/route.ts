import { NextResponse } from "next/server";
import { requirePermission, getAccessibleBranchIds } from "@/lib/auth/authorization";
import { apiErrorFromUnknown } from "@/lib/api/response";
import { getDashboardMetrics } from "@/lib/dashboard/dashboard-metrics";

export async function GET() {
  try {
    await requirePermission("report.read");
    const ids = await getAccessibleBranchIds();
    const metrics = await getDashboardMetrics(ids);
    const data = [
      { id: "revenue-month", name: "Doanh thu tháng", type: "Doanh thu", period: "Tháng hiện tại", status: `${metrics.finance.monthRevenue.toLocaleString("vi-VN")} VNĐ` },
      { id: "revenue-total", name: "Tổng doanh thu", type: "Doanh thu", period: "Tất cả thời gian", status: `${metrics.finance.allTimeRevenue.toLocaleString("vi-VN")} VNĐ` },
      { id: "collection", name: "Đã thu", type: "Thanh toán", period: "Khoản đã thanh toán", status: `${metrics.finance.allTimeRevenue.toLocaleString("vi-VN")} VNĐ` },
      { id: "due", name: "Còn phải thu", type: "Thanh toán", period: "Giao dịch chờ thanh toán", status: `${metrics.finance.pendingAmount.toLocaleString("vi-VN")} VNĐ` },
      { id: "members", name: "Hội viên", type: "Hội viên", period: "Hiện tại", status: `${metrics.members.total} hội viên / ${metrics.members.active} đang hoạt động` },
      { id: "checkins", name: "Check-in", type: "Check-in", period: "7 ngày gần nhất", status: `${metrics.attendance.last7Days} lượt hợp lệ` },
      { id: "leads", name: "CRM", type: "Leads", period: "Cần xử lý", status: `${metrics.crm.dueFollowUps} follow-up / ${metrics.crm.inactive14Days} hội viên ít hoạt động` },
    ];
    return NextResponse.json({ data });
  } catch (e) { return apiErrorFromUnknown(e, "Không thể tạo báo cáo từ dữ liệu PostgreSQL."); }
}
