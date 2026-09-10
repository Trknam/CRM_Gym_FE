import type { Metadata } from "next";
import "@/app/globals.css";
export const metadata: Metadata = {
  title: "GymCRM",
  description: "Gym CRM & AI Workout Planner",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
