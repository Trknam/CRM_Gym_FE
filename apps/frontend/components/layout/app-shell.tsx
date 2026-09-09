import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="min-h-screen md:ml-[250px]">
        <Header />
        <main>{children}</main>
      </div>
    </div>
  );
}
