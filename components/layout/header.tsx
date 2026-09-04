import { Bell, Search } from "lucide-react";

export function Header() {
  return (
    <header className="flex min-h-[72px] items-center justify-between border-b border-[#e8ebf2] bg-white px-5 md:px-8">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">GymCRM</p>
        <h1 className="text-lg font-bold text-[#172033]">Quản lý phòng Gym</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-[#e8ebf2] bg-[#fafbfc] px-3 py-2 sm:flex">
          <Search size={16} className="text-[#98a2b3]" />
          <input className="w-44 bg-transparent text-sm outline-none" placeholder="Tìm kiếm..." />
        </div>
        <button aria-label="Thông báo" className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#e8ebf2] bg-white">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="hidden items-center gap-2 sm:flex">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e8e7ff] text-sm font-bold text-[#635bff]">A</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Admin</div>
            <div className="text-[11px] text-[#98a2b3]">Manager</div>
          </div>
        </div>
      </div>
    </header>
  );
}
