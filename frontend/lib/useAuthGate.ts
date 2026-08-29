"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";

/** Redirects to /login when there's no valid session, otherwise returns the
 * signed-in user. Returns null (and renders nothing) while checking or
 * redirecting - the session cookie can only be verified by asking the
 * server, so this can't resolve synchronously during the initial render. */
export function useAuthGate(): AuthUser | null {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((current) => {
      if (cancelled) return;
      if (!current) {
        router.replace("/login");
        return;
      }
      setUser(current);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return user;
}

export function useLogout(): () => void {
  const router = useRouter();
  return () => {
    logout().finally(() => router.push("/login"));
  };
}
