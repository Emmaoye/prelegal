"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, clearStoredUser, getStoredUser } from "@/lib/auth";

/** Redirects to /login when no fake-authenticated user is stored, otherwise
 * returns that user. Returns null (and renders nothing) while redirecting.
 * localStorage isn't available at prerender time, so this has to read it
 * after mount rather than during the initial render. */
export function useAuthGate(): AuthUser | null {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage, which isn't readable until after mount
    setUser(stored);
  }, [router]);

  return user;
}

export function useLogout(): () => void {
  const router = useRouter();
  return () => {
    clearStoredUser();
    router.push("/login");
  };
}
