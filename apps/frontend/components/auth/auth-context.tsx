"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type CurrentUser = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: "SUPER_ADMIN" | "BRANCH_MANAGER" | "STAFF" | "TRAINER";
};

type AuthContextValue = { user: CurrentUser; loading: boolean };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let redirected = false;

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (response.status === 401) {
          if (!cancelled && !redirected) {
            redirected = true;
            setUser(null);
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          }
          return;
        }

        if (!response.ok) {
          if (!cancelled) setError("Không thể kiểm tra phiên đăng nhập. Vui lòng thử tải lại trang.");
          return;
        }

        const data = await response.json();
        if (!cancelled && data?.user) setUser(data.user);
        else if (!cancelled && !redirected) {
          redirected = true;
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      } catch {
        if (!cancelled) setError("Không thể kết nối tới máy chủ xác thực. Vui lòng thử lại.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkSession();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => {
    if (!user) return null;
    return { user, loading };
  }, [user, loading]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[var(--surface)] text-sm text-[var(--muted)]">Đang kiểm tra phiên đăng nhập...</div>;
  }

  if (!user) {
    return <div className="grid min-h-screen place-items-center bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">{error || "Phiên đăng nhập không hợp lệ."}</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
