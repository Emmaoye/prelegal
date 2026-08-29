export interface AuthUser {
  id: number;
  email: string;
}

export class AuthError extends Error {}

async function postAuth(path: "signup" | "signin", email: string, password: string): Promise<AuthUser> {
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

/** The signed-in user, verified server-side against the session cookie, or
 * null if there isn't a valid session. This (not client-side storage) is
 * the source of truth for whether someone is logged in. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me");
  if (!response.ok) return null;
  return (await response.json()) as AuthUser;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
