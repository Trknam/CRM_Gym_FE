export function RevenueChart() {
  const bars = [42,58,48,72,66,88,76,94,82,100,92,108];
  return <section className="card p-5">
    <div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold">Doanh thu</h3><p className="text-xs text-[#98a2b3]">6 tháng gần nhất</p></div><button className="rounded-lg border border-[#e8ebf2] px-3 py-2 text-xs">6 tháng</button></div>
    <div className="flex h-64 items-end gap-3 border-b border-[#eef0f4] px-2">{bars.map((h,i)=><div key={i} className="group flex h-full flex-1 items-end"><div className="w-full rounded-t-lg bg-[#dcd9ff] transition group-hover:bg-[#635bff]" style={{height:`${h*2}px`,maxHeight:"88%"}}/></div>)}</div>
    <div className="mt-3 flex justify-between px-2 text-[11px] text-[#98a2b3]">{["T4","T5","T6","T7","T8","T9"].map(x=><span key={x}>{x}</span>)}</div>
  </section>;
}
