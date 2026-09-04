 "use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { WorkoutInputForm } from "@/components/ai-workout/workout-input-form";
import { WorkoutPreview } from "@/components/ai-workout/workout-preview";

export function AIWorkoutPage() {
  const [generated, setGenerated] = useState(false);
  return <>
    <PageTitle title="AI Workout Planner" description="Cá nhân hóa kế hoạch tập dựa trên hồ sơ hội viên"/>
    <div className="px-5 pb-8 md:px-8">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <WorkoutInputForm generated={generated} onGenerate={() => setGenerated(true)}/>
        <section className="card p-5">
          {!generated ? <div className="grid min-h-[560px] place-items-center text-center"><div><div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[#f1f0ff] text-[#635bff]"><Sparkles size={28}/></div><h2 className="text-lg font-bold">Workout Plan sẽ xuất hiện ở đây</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">Luồng: User Profile → Rule/Filter Engine → Exercise Database → AI → Workout Plan.</p></div></div> : <WorkoutPreview/>}
        </section>
      </div>
    </div>
  </>;
}
