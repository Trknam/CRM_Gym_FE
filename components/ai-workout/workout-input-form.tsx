import { CalendarDays, Clock3, Dumbbell, Sparkles, Target, UserRound } from "lucide-react";

const fields = [
 {label:"Hội viên",value:"Nguyễn Văn An",icon:UserRound},
 {label:"Mục tiêu",value:"Giảm cân / giảm mỡ",icon:Target},
 {label:"Trình độ",value:"Beginner",icon:Dumbbell},
 {label:"Số buổi / tuần",value:"4",icon:CalendarDays},
 {label:"Thời lượng / buổi",value:"60 phút",icon:Clock3},
 {label:"Thiết bị",value:"Gym đầy đủ thiết bị",icon:Dumbbell},
];

export function WorkoutInputForm({generated,onGenerate}:{generated:boolean;onGenerate:()=>void}) {
 return <section className="card p-5"><div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eeecff] text-[#635bff]"><Sparkles/></div><div><h2 className="font-bold">Thông tin đầu vào</h2><p className="text-xs text-[#98a2b3]">AI sẽ dựa vào dữ liệu này</p></div></div><div className="space-y-4">
 {fields.map(({label,value,icon:Icon})=><div key={label}><label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]"><Icon size={14}/>{label}</label><input className="w-full rounded-xl border border-[#e8ebf2] px-3 py-2.5 text-sm outline-none focus:border-[#635bff]" defaultValue={value}/></div>)}
 <div><label className="mb-2 block text-xs font-semibold text-[#667085]">Sở thích</label><textarea className="min-h-20 w-full resize-none rounded-xl border border-[#e8ebf2] p-3 text-sm outline-none focus:border-[#635bff]" defaultValue="Ưu tiên cardio, không thích chạy bộ quá lâu."/></div>
 <button onClick={onGenerate} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#635bff] py-3 text-sm font-semibold text-white"><Sparkles size={17}/>{generated?"Đã tạo kế hoạch mẫu":"Tạo Workout bằng AI"}</button>
 </div></section>;
}
