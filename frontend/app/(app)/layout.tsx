"use client";

import AppHeader from "@/components/AppHeader";
import { useAuthGate, useLogout } from "@/lib/useAuthGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthGate();
  const logout = useLogout();

  if (!user) return null;

  return (
    <>
      <AppHeader user={user} onLogout={logout} />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </>
  );
}
