"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Dumbbell, Loader2, Sparkles, Target, UserRound } from "lucide-react";

type Member = { id: string; name: string };
type Props = { onGenerated: (result: any) => void; onError: (message: string) => void };

export function WorkoutInputForm({ onGenerated, onError }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ memberId: "", goal: "Tăng cơ", level: "Beginner", sessionsPerWeek: "3", durationMinutes: "60", equipment: "Gym đầy đủ thiết bị", preferences: "", limitations: "" });

  useEffect(() => {
    fetch("/api/members", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể lấy danh sách hội viên.");
      setMembers(result.data ?? []);
      setForm((current) => ({ ...current, memberId: current.memberId || result.data?.[0]?.id || "" }));
    }).catch((error) => onError(error.message)).finally(() => setLoadingMembers(false));
  }, [onError]);

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const inputClass = "w-full rounded-xl border border-[#e8ebf2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff]";

  async function generate() {
    setLoading(true);
    onError("");
    try {
      const response = await fetch("/api/workouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, sessionsPerWeek: Number(form.sessionsPerWeek), durationMinutes: Number(form.durationMinutes) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể tạo workout.");
      onGenerated(result.data);
    } catch (error) { onError(error instanceof Error ? error.message : "Không thể tạo workout."); }
    finally { setLoading(false); }
  }

  return <section className="card p-5"><div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eeecff] text-[#635bff]"><Sparkles/></div><div><h2 className="font-bold">Thông tin đầu vào</h2><p className="text-xs text-[#98a2b3]">Rule Engine lọc Exercise trước, AI chỉ được chọn từ danh sách đã lọc.</p></div></div>
    <div className="space-y-4">
      <div><label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]"><UserRound size={14}/>Hội viên</label><select disabled={loadingMembers} className={inputClass} value={form.memberId} onChange={(e) => update("memberId", e.target.value)}><option value="">{loadingMembers ? "Đang tải..." : "Chọn hội viên"}</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
      <div><label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]"><Target size={14}/>Mục tiêu</label><select className={inputClass} value={form.goal} onChange={(e) => update("goal", e.target.value)}><option>Tăng cơ</option><option>Giảm cân / giảm mỡ</option><option>Tăng sức mạnh</option><option>Cải thiện thể lực</option><option>Phục hồi thể lực nhẹ</option></select></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]"><Dumbbell size={14}/>Trình độ</label><select className={inputClass} value={form.level} onChange={(e) => update("level", e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><div><label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]"><CalendarDays size={14}/>Số buổi / tuần</label><input type="number" min="1" max="7" className={inputClass} value={form.sessionsPerWeek} onChange={(e) => update("sessionsPerWeek", e.target.value)}/></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]"><Clock3 size={14}/>Thời lượng / buổi</label><input type="number" min="20" max="180" className={inputClass} value={form.durationMinutes} onChange={(e) => update("durationMinutes", e.target.value)}/></div><div><label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#667085]"><Dumbbell size={14}/>Thiết bị</label><input className={inputClass} value={form.equipment} onChange={(e) => update("equipment", e.target.value)}/></div></div>
      <div><label className="mb-2 block text-xs font-semibold text-[#667085]">Sở thích</label><textarea className="min-h-20 w-full resize-none rounded-xl border border-[#e8ebf2] p-3 text-sm outline-none focus:border-[#635bff]" value={form.preferences} onChange={(e) => update("preferences", e.target.value)} placeholder="Ví dụ: ưu tiên máy, thích cardio nhẹ..."/></div>
      <div><label className="mb-2 block text-xs font-semibold text-[#667085]">Hạn chế / chấn thương cần lưu ý</label><textarea className="min-h-20 w-full resize-none rounded-xl border border-[#e8ebf2] p-3 text-sm outline-none focus:border-[#635bff]" value={form.limitations} onChange={(e) => update("limitations", e.target.value)} placeholder="Ví dụ: đau gối khi chạy..."/></div>
      <button disabled={loading || !form.memberId} onClick={generate} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#635bff] py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{loading ? <><Loader2 size={17} className="animate-spin"/>AI đang tạo và lưu lịch...</> : <><Sparkles size={17}/>Tạo &amp; lưu lịch tập bằng AI</>}</button>
    </div>
  </section>;
}