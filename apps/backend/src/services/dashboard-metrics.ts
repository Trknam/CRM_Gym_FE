import { prisma } from "../db/prisma";

export type DashboardMetrics = {
  today: {
    newMembers: number;
    checkIns: number;
    revenue: number;
    paidTransactions: number;
    newLeads: number;
    followUps: number;
  };
  members: {
    total: number;
    active: number;
    inactive: number;
    expiring7Days: number;
    expired: number;
  };
  finance: {
    monthRevenue: number;
    allTimeRevenue: number;
    pendingAmount: number;
    pendingTransactions: number;
  };
  crm: {
    newLeads: number;
    dueFollowUps: number;
    inactive14Days: number;
  };
  attendance: {
    today: number;
    last7Days: number;
  };
  recentMembers: Array<{
    id: string;
    name: string;
    phone: string;
    packageName: string;
    expiry: Date | null;
  }>;
  revenueByMonth: Array<{ label: string; value: number }>;
};

type BranchFilter = { branchId: { in: string[] } } | Record<string, never>;

function vietnamParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

function vietnamBoundary(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, -7));
}

export function getVietnamDateRange() {
  const now = new Date();
  const { year, month, day } = vietnamParts(now);
  const startOfToday = vietnamBoundary(year, month, day);
  const startOfTomorrow = vietnamBoundary(year, month, day + 1);
  const startOfMonth = vietnamBoundary(year, month, 1);
  const startOfNextMonth = vietnamBoundary(year, month + 1, 1);
  const startOfSevenDaysAgo = new Date(startOfToday);
  startOfSevenDaysAgo.setUTCDate(startOfSevenDaysAgo.getUTCDate() - 7);
  const startOfFourteenDaysAgo = new Date(startOfToday);
  startOfFourteenDaysAgo.setUTCDate(startOfFourteenDaysAgo.getUTCDate() - 14);
  const sevenDaysFromNow = new Date(startOfTomorrow);
  sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 6);
  return { now, startOfToday, startOfTomorrow, startOfMonth, startOfNextMonth, startOfSevenDaysAgo, startOfFourteenDaysAgo, sevenDaysFromNow };
}

export async function getDashboardMetrics(branchIds: string[] | null): Promise<DashboardMetrics> {
  const branchFilter: BranchFilter = branchIds === null ? {} : { branchId: { in: branchIds } };
  const range = getVietnamDateRange();
  const { now, startOfToday, startOfTomorrow, startOfMonth, startOfSevenDaysAgo, startOfFourteenDaysAgo, sevenDaysFromNow } = range;

  const months = Array.from({ length: 6 }, (_, index) => {
    const { year, month } = vietnamParts(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1)));
    return { date: vietnamBoundary(year, month, 1), label: `T${month}` };
  });

  const [
    totalMembers,
    activeMembers,
    inactiveMembers,
    expiredMemberships,
    expiringMemberships,
    todayNewMembers,
    todayCheckIns,
    weekCheckIns,
    todayRevenue,
    monthRevenue,
    allTimeRevenue,
    pendingPayments,
    todayNewLeads,
    dueFollowUps,
    inactive14Days,
    recentMembers,
    revenuePayments,
  ] = await Promise.all([
    prisma.member.count({ where: branchFilter }),
    prisma.member.count({ where: { ...branchFilter, status: "ACTIVE", memberships: { some: { status: "ACTIVE", endDate: { gte: now } } } } }),
    prisma.member.count({ where: { ...branchFilter, status: "INACTIVE" } }),
    prisma.membership.count({ where: { member: branchFilter, endDate: { lt: now }, status: { not: "CANCELLED" } } }),
    prisma.membership.count({ where: { member: branchFilter, status: "ACTIVE", endDate: { gte: now, lte: sevenDaysFromNow } } }),
    prisma.member.count({ where: { ...branchFilter, joinedAt: { gte: startOfToday, lt: startOfTomorrow } } }),
    prisma.checkIn.count({ where: { ...branchFilter, checkedInAt: { gte: startOfToday, lt: startOfTomorrow }, status: "VALID" } }),
    prisma.checkIn.count({ where: { ...branchFilter, checkedInAt: { gte: startOfSevenDaysAgo, lt: startOfTomorrow }, status: "VALID" } }),
    prisma.payment.aggregate({ where: { ...branchFilter, status: "PAID", paidAt: { gte: startOfToday, lt: startOfTomorrow } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { ...branchFilter, status: "PAID", paidAt: { gte: startOfMonth, lt: startOfTomorrow } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...branchFilter, status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...branchFilter, status: "PENDING" }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.lead.count({ where: { ...branchFilter, createdAt: { gte: startOfToday, lt: startOfTomorrow } } }),
    prisma.lead.count({ where: { ...branchFilter, status: { in: ["NEW", "POTENTIAL"] }, nextFollowUpAt: { lte: now } } }),
    prisma.member.count({ where: { ...branchFilter, status: "ACTIVE", memberships: { some: { status: "ACTIVE", endDate: { gte: now } } }, checkIns: { none: { status: "VALID", checkedInAt: { gte: startOfFourteenDaysAgo, lt: startOfTomorrow } } } } }),
    prisma.member.findMany({ where: branchFilter, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, fullName: true, phone: true, memberships: { orderBy: { endDate: "desc" }, take: 1, select: { endDate: true, package: { select: { name: true } } } } } }),
    prisma.payment.findMany({ where: { ...branchFilter, status: "PAID", paidAt: { gte: months[0].date, lt: new Date(months[months.length - 1].date.getTime() + 32 * 86400000) } }, select: { amount: true, paidAt: true } }),
  ]);

  const revenueByMonth = months.map(({ date, label }, index) => {
    const end = index === months.length - 1 ? range.startOfNextMonth : months[index + 1].date;
    const value = revenuePayments.filter((payment) => payment.paidAt && payment.paidAt >= date && payment.paidAt < end).reduce((sum, payment) => sum + Number(payment.amount), 0);
    return { label, value };
  });

  return {
    today: {
      newMembers: todayNewMembers,
      checkIns: todayCheckIns,
      revenue: Number(todayRevenue._sum.amount ?? 0),
      paidTransactions: todayRevenue._count._all,
      newLeads: todayNewLeads,
      followUps: dueFollowUps,
    },
    members: { total: totalMembers, active: activeMembers, inactive: inactiveMembers, expiring7Days: expiringMemberships, expired: expiredMemberships },
    finance: { monthRevenue: Number(monthRevenue._sum.amount ?? 0), allTimeRevenue: Number(allTimeRevenue._sum.amount ?? 0), pendingAmount: Number(pendingPayments._sum.amount ?? 0), pendingTransactions: pendingPayments._count._all },
    crm: { newLeads: todayNewLeads, dueFollowUps, inactive14Days },
    attendance: { today: todayCheckIns, last7Days: weekCheckIns },
    recentMembers: recentMembers.map((member) => ({ id: member.id, name: member.fullName, phone: member.phone, packageName: member.memberships[0]?.package.name ?? "Chưa có gói", expiry: member.memberships[0]?.endDate ?? null })),
    revenueByMonth,
  };
}

