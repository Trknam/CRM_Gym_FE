import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, change, icon: Icon }: {
  label: string; value: string; change: string; icon: LucideIcon;
}) {
  return <div className="card p-5">
    <div className="mb-5 flex items-center justify-between">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1f0ff] text-[#635bff]"><Icon size={19}/></div>
      <span className="text-xs font-semibold text-emerald-600">{change}</span>
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="mt-1 text-sm text-[#667085]">{label}</div>
  </div>;
}
