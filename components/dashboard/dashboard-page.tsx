import Link from "next/link";
import { Users, CreditCard, QrCode, UserRoundPlus, Sparkles, UserCog, Building2 } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { StatCard } from "@/components/ui/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { CrmAlerts } from "@/components/dashboard/crm-alerts";
import { RecentMembers } from "@/components/dashboard/recent-members";
import { getCurrentUser } from "@/lib/auth/session";
import { getAccessibleBranchIds } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return `${Math.round(amount)}`;
}

export async function DashboardPage() {
  const user = await getCurrentUser();
  const branchIds = await getAccessibleBranchIds();
  const branchFilter = branchIds === null ? {} : { branchId: { in: branchIds } };
  const displayName = user?.fullName?.trim() || "bạn";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysFromNow = new Date(startOfToday);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const fourteenDaysAgo = new Date(startOfToday);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    totalMembers,
    activeMembers,
    todayCheckIns,
    monthlyRevenue,
    employeeCount,
    trainerCount,
    branchCount,
    expiringMemberships,
    inactiveMembers,
    pendingLeads,
    recentMembers,
  ] = await Promise.all([
    prisma.member.count({ where: branchFilter }),
    prisma.member.count({
      where: {
        ...branchFilter,
        status: "ACTIVE",
        memberships: { some: { status: "ACTIVE", endDate: { gte: now } } },
      },
    }),
    prisma.checkIn.count({ where: { ...branchFilter, checkedInAt: { gte: startOfToday }, status: "VALID" } }),
    prisma.payment.aggregate({
      where: { ...branchFilter, status: "PAID", paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.user.count({
      where: {
        isActive: true,
        role: { in: ["BRANCH_MANAGER", "STAFF"] },
        ...(branchIds === null ? {} : { userBranches: { some: { branchId: { in: branchIds } } } }),
      },
    }),
    prisma.user.count({
      where: {
        isActive: true,
        role: "TRAINER",
        ...(branchIds === null ? {} : { userBranches: { some: { branchId: { in: branchIds } } } }),
      },
    }),
    prisma.branch.count({ where: branchIds === null ? { isActive: true } : { id: { in: branchIds }, isActive: true } }),
    prisma.membership.count({
      where: { member: branchFilter, status: "ACTIVE", endDate: { gte: now, lte: sevenDaysFromNow } },
    }),
    prisma.member.count({
      where: {
        ...branchFilter,
        status: "ACTIVE",
        memberships: { some: { status: "ACTIVE", endDate: { gte: now } } },
        checkIns: { none: { status: "VALID", checkedInAt: { gte: fourteenDaysAgo } } },
      },
    }),
    prisma.lead.count({
      where: { ...branchFilter, status: { in: ["NEW", "POTENTIAL"] }, nextFollowUpAt: { lte: now } },
    }),
    prisma.member.findMany({
      where: branchFilter,
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { package: true } } },
    }),
  ]);

  const stats = [
    { label: "Tổng hội viên", value: totalMembers.toLocaleString("vi-VN"), change: "Thực tế", icon: Users, href: "/members" },
    { label: "Đang hoạt động", value: activeMembers.toLocaleString("vi-VN"), change: "Có gói còn hạn", icon: Users, href: "/members" },
    { label: "Check-in hôm nay", value: todayCheckIns.toLocaleString("vi-VN"), change: "Hôm nay", icon: QrCode, href: "/checkin" },
    { label: "Doanh thu tháng", value: `${formatMoney(Number(monthlyRevenue._sum.amount ?? 0))}`, change: "Đã thanh toán", icon: CreditCard, href: "/payments" },
    { label: "Nhân viên", value: employeeCount.toLocaleString("vi-VN"), change: "Đang hoạt động", icon: UserCog, href: "/settings" },
    { label: "PT / Trainer", value: trainerCount.toLocaleString("vi-VN"), change: "Đang hoạt động", icon: UserRoundPlus, href: "/trainers" },
    { label: "Chi nhánh", value: branchCount.toLocaleString("vi-VN"), change: "Đang hoạt động", icon: Building2, href: "/settings" },
  ];

  return <>
    <PageTitle title="Dashboard" description="Tổng quan hoạt động phòng Gym"
      action={<Link href="/ai-workout" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#635bff] px-4 py-2.5 text-sm font-semibold text-white"><Sparkles size={17}/>Tạo AI Workout</Link>}
    />
    <div className="px-5 pb-8 md:px-8">
      <div className="mb-6"><h3 className="text-xl font-bold">Chào buổi sáng, {displayName} 👋</h3><p className="mt-1 text-sm text-[#667085]">Đây là tình hình hoạt động hôm nay.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((s) => <StatCard key={s.label} {...s}/>)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><RevenueChart branchIds={branchIds}/><CrmAlerts expiringCount={expiringMemberships} inactiveCount={inactiveMembers} leadCount={pendingLeads}/></div>
      <RecentMembers members={recentMembers.map((member) => ({ name: member.fullName, phone: member.phone, packageName: member.memberships[0]?.package.name ?? "Chưa có gói", expiry: member.memberships[0]?.endDate ?? null }))}/>
    </div>
  </>;
}
