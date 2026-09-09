"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRoutes = void 0;
const express_1 = require("express");
const authorization_1 = require("../auth/authorization");
const dashboard_metrics_1 = require("../services/dashboard-metrics");
const valkey_1 = require("../cache/valkey");
const keys_1 = require("../cache/keys");
exports.dashboardRoutes = (0, express_1.Router)();
exports.dashboardRoutes.get("/", async (req, res) => { try {
    await (0, authorization_1.requireUser)(req);
    const ids = await (0, authorization_1.getAccessibleBranchIds)(req), key = keys_1.cacheKeys.dashboard(ids === null ? "all" : ids.sort().join(",") || "none"), cached = await (0, valkey_1.cacheGet)(key);
    if (cached)
        return res.json({ data: cached, cached: true });
    const data = await (0, dashboard_metrics_1.getDashboardMetrics)(ids);
    const serializable = { ...data, recentMembers: data.recentMembers.map(m => ({ ...m, expiry: m.expiry?.toISOString() ?? null })) };
    await (0, valkey_1.cacheSet)(key, serializable, 30);
    return res.json({ data: serializable, cached: false });
}
catch (error) {
    const s = error?.status;
    if (s)
        return res.status(s).json({ message: error.message });
    console.error("[dashboard] failed", error);
    return res.status(500).json({ message: "Không thể lấy dữ liệu Dashboard." });
} });
