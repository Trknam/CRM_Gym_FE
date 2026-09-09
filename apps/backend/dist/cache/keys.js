"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheKeys = void 0;
exports.cacheKeys = {
    members: (branchScope) => `gymcrm:members:${branchScope}`,
    packages: (branchScope, status = "all") => `gymcrm:packages:${branchScope}:${status}`,
    trainers: (branchScope) => `gymcrm:trainers:${branchScope}`,
    leads: (branchScope) => `gymcrm:leads:${branchScope}`,
    checkins: (branchScope) => `gymcrm:checkins:${branchScope}`,
    payments: (branchScope) => `gymcrm:payments:${branchScope}`,
    exercises: () => `gymcrm:exercises:active`,
    settings: (branchScope) => `gymcrm:settings:${branchScope}`,
    crm: (branchScope) => `gymcrm:crm:${branchScope}`,
    reports: (branchScope) => `gymcrm:reports:${branchScope}`,
    dashboard: (branchScope) => `gymcrm:dashboard:${branchScope}`,
};
