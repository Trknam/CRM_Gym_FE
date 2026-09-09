import Link from "next/link";
import { Dumbbell } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <Link href="/" className="mx-auto mb-7 flex items-center gap-2 text-xl font-bold text-[var(--foreground)]">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-white"><Dumbbell size={19} /></span>
          GymCRM
        </Link>
        {children}
      </div>
    </main>
  );
}
