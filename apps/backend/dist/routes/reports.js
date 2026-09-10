"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRoutes = void 0;
const express_1 = require("express");
const authorization_1 = require("../auth/authorization");
const dashboard_metrics_1 = require("../services/dashboard-metrics");
const valkey_1 = require("../cache/valkey");
const keys_1 = require("../cache/keys");
exports.reportsRoutes = (0, express_1.Router)();
exports.reportsRoutes.get("/", async (req, res) => { try {
    await (0, authorization_1.requirePermission)(req, "report.read");
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req);
    const key = keys_1.cacheKeys.reports(ids === null ? "all" : ids.sort().join(",") || "none");
    const cached = await (0, valkey_1.cacheGet)(key);
    if (cached)
        return res.json({ data: cached, cached: true });
    const m = await (0, dashboard_metrics_1.getDashboardMetrics)(ids);
    const data = [{ id: "revenue-month", name: "Doanh thu tháng", type: "Doanh thu", period: "Tháng hiện tại", status: `${m.finance.monthRevenue.toLocaleString("vi-VN")} VNĐ` }, { id: "revenue-total", name: "Tổng doanh thu", type: "Doanh thu", period: "Tất cả thời gian", status: `${m.finance.allTimeRevenue.toLocaleString("vi-VN")} VNĐ` }, { id: "collection", name: "Đã thu", type: "Thanh toán", period: "Khoản đã thanh toán", status: `${m.finance.allTimeRevenue.toLocaleString("vi-VN")} VNĐ` }, { id: "due", name: "Còn phải thu", type: "Thanh toán", period: "Giao dịch chờ thanh toán", status: `${m.finance.pendingAmount.toLocaleString("vi-VN")} VNĐ` }, { id: "members", name: "Hội viên", type: "Hội viên", period: "Hiện tại", status: `${m.members.total} hội viên / ${m.members.active} đang hoạt động` }, { id: "checkins", name: "Check-in", type: "Check-in", period: "7 ngày gần nhất", status: `${m.attendance.last7Days} lượt hợp lệ` }, { id: "leads", name: "CRM", type: "Leads", period: "Cần xử lý", status: `${m.crm.dueFollowUps} follow-up / ${m.crm.inactive14Days} hội viên ít hoạt động` }];
    await (0, valkey_1.cacheSet)(key, data, 30);
    return res.json({ data, cached: false });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    console.error("[reports] failed", error);
    return res.status(500).json({ message: "Không thể tạo báo cáo từ dữ liệu PostgreSQL." });
} });
