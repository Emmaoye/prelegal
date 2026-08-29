"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthError, signIn, signUp } from "@/lib/auth";

const labelClasses = "block text-sm font-medium text-gray-700";
const inputClasses =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await (mode === "signup" ? signUp(email, password) : signIn(email, password));
      router.push("/");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-navy/5 to-brand-blue/5 px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand-navy">Prelegal</h1>
          <p className="mt-2 text-sm text-brand-gray">Draft legal agreements in minutes, not days.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
          <p className="mb-6 text-sm text-brand-gray">
            {mode === "signin" ? "Sign in to continue." : "Create an account to get started."}
          </p>

          <div className="flex rounded-md border border-gray-300 p-1 text-sm">
            <button
              type="button"
              aria-label="Switch to sign in"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${
                mode === "signin" ? "bg-brand-navy text-white" : "text-gray-600"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-label="Switch to sign up"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${
                mode === "signup" ? "bg-brand-navy text-white" : "text-gray-600"
              }`}
            >
              Sign up
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className={labelClasses}>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
              />
            </label>
            <label className={labelClasses}>
              Password
              <input
                type="password"
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClasses}
              />
            </label>

            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-brand-purple px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-purple-hover disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSubmitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
