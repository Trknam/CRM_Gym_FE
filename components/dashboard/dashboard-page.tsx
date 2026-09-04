import Link from "next/link";
import { Users, CreditCard, QrCode, UserRoundPlus, AlertTriangle, Clock3, Sparkles } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { StatCard } from "@/components/ui/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { CrmAlerts } from "@/components/dashboard/crm-alerts";
import { RecentMembers } from "@/components/dashboard/recent-members";

const stats = [
  { label: "Tổng hội viên", value: "1,250", change: "+8.2%", icon: Users },
  { label: "Đang hoạt động", value: "980", change: "+4.1%", icon: Users },
  { label: "Check-in hôm nay", value: "186", change: "+12.5%", icon: QrCode },
  { label: "Doanh thu tháng", value: "245M", change: "+9.7%", icon: CreditCard },
];

export function DashboardPage() {
  return <>
    <PageTitle title="Dashboard" description="Tổng quan hoạt động phòng Gym"
      action={<Link href="/ai-workout" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#635bff] px-4 py-2.5 text-sm font-semibold text-white"><Sparkles size={17}/>Tạo AI Workout</Link>}
    />
    <div className="px-5 pb-8 md:px-8">
      <div className="mb-6"><h3 className="text-xl font-bold">Chào buổi sáng, Admin 👋</h3><p className="mt-1 text-sm text-[#667085]">Đây là tình hình hoạt động hôm nay.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((s) => <StatCard key={s.label} {...s}/>)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><RevenueChart/><CrmAlerts/></div>
      <RecentMembers/>
    </div>
  </>;
}
