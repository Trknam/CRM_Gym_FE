"use client";

import { AuthProvider } from "@/components/auth/auth-context";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
