export interface AuthUser {
  id: number;
  email: string;
}

const STORAGE_KEY = "prelegal_user";

export class AuthError extends Error {}

async function postAuth(path: "signup" | "signin", email: string, password: string) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AuthError(body?.detail ?? "Something went wrong. Please try again.");
  }

  return (await response.json()) as AuthUser;
}

export function signUp(email: string, password: string): Promise<AuthUser> {
  return postAuth("signup", email, password);
}

export function signIn(email: string, password: string): Promise<AuthUser> {
  return postAuth("signin", email, password);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
