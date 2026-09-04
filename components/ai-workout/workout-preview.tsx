import { ChevronRight } from "lucide-react";

const days = [
 ["Thứ 2","Lower Body + Cardio",["Squat · 3 × 10","Leg Press · 3 × 12","Walking · 20 phút"]],
 ["Thứ 4","Upper Body + Cardio",["Lat Pulldown · 3 × 10","Chest Press · 3 × 12","Bike · 15 phút"]],
 ["Thứ 6","Full Body",["Goblet Squat · 3 × 10","Seated Row · 3 × 12","Incline Walk · 20 phút"]],
 ["Chủ nhật","Cardio + Core",["Cycling · 25 phút","Plank · 3 × 30s","Dead Bug · 3 × 10"]],
] as const;

export function WorkoutPreview() {
 return <div><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Kế hoạch 4 buổi / tuần</h2><p className="text-xs text-[#98a2b3]">Mục tiêu: giảm cân · Beginner · 60 phút</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">AI Generated</span></div>
 <div className="grid gap-3">{days.map(([day,title,exercises])=><div key={day} className="rounded-xl border border-[#e8ebf2] p-4"><div className="mb-3 flex items-center justify-between"><div><span className="text-xs font-bold text-[#635bff]">{day}</span><h3 className="font-semibold">{title}</h3></div><ChevronRight size={17} className="text-[#98a2b3]"/></div><div className="grid gap-2 sm:grid-cols-3">{exercises.map(x=><div key={x} className="rounded-lg bg-[#fafbfc] p-3 text-xs text-[#475467]">{x}</div>)}</div></div>)}</div>
 <div className="mt-5 rounded-xl bg-[#f7f7ff] p-4 text-sm leading-6 text-[#667085]"><strong className="text-[#172033]">Nguyên tắc:</strong> AI chỉ cá nhân hóa từ Exercise Database và các ràng buộc do hệ thống xác định.</div></div>;
}
