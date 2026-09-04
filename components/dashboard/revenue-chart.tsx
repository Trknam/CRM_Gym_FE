import { prisma } from "@/lib/db/prisma";

function formatMoney(value: number): string {
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${Math.round(value)}`;
}

export async function RevenueChart({ branchIds }: { branchIds: string[] | null }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return { date, label: `T${date.getMonth() + 1}` };
  });

  const payments = await prisma.payment.findMany({
    where: {
      ...(branchIds === null ? {} : { branchId: { in: branchIds } }),
      status: "PAID",
      paidAt: { gte: months[0].date },
    },
    select: { amount: true, paidAt: true },
  });

  const values = months.map(({ date }, index) => {
    const end = index === months.length - 1 ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : months[index + 1].date;
    return payments
      .filter((payment) => payment.paidAt && payment.paidAt >= date && payment.paidAt < end)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
  });
  const max = Math.max(...values, 1);

  return <section className="card p-5">
    <div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold">Doanh thu</h3><p className="text-xs text-[#98a2b3]">6 tháng gần nhất · dữ liệu thực tế</p></div><span className="rounded-lg border border-[#e8ebf2] px-3 py-2 text-xs">{formatMoney(values.reduce((a, b) => a + b, 0))}</span></div>
    <div className="flex h-64 items-end gap-3 border-b border-[#eef0f4] px-2">
      {values.map((value, index) => <div key={months[index].label} className="group flex h-full flex-1 items-end" title={`${months[index].label}: ${value.toLocaleString("vi-VN")} VNĐ`}><div className="w-full rounded-t-lg bg-[#dcd9ff] transition group-hover:bg-[#635bff]" style={{ height: `${Math.max((value / max) * 88, value ? 5 : 2)}%` }} /></div>)}
    </div>
    <div className="mt-3 flex justify-between px-2 text-[11px] text-[#98a2b3]">{months.map((month) => <span key={month.label}>{month.label}</span>)}</div>
  </section>;
}
