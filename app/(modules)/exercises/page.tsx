import { CrudModulePage } from "@/components/modules/crud-module-page";

export default function ExercisesPage() {
  return <CrudModulePage title="Exercise Database" description="Kho bài tập được kiểm soát để phục vụ AI Workout Planner." action="Thêm bài tập" moduleKey="exercises" fields={[{key:"name",label:"Tên bài tập",required:true},{key:"muscle",label:"Nhóm cơ",required:true},{key:"equipment",label:"Thiết bị"},{key:"level",label:"Trình độ",type:"select",options:["Beginner","Intermediate","Advanced"]}]} columns={["name","muscle","equipment","level"]} seed={[]}/>;
}
