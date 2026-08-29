"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthError, setStoredUser, signIn, signUp } from "@/lib/auth";

const labelClasses = "block text-sm font-medium text-gray-700";
const inputClasses =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#209dd7] focus:outline-none focus:ring-1 focus:ring-[#209dd7]";

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
      const user = mode === "signup" ? await signUp(email, password) : await signIn(email, password);
      setStoredUser(user);
      router.push("/");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-[#032147]">Prelegal</h1>
      <p className="mt-1 text-sm text-[#888888]">
        {mode === "signin" ? "Sign in to continue." : "Create an account to get started."}
      </p>

      <div className="mt-6 flex rounded-md border border-gray-300 p-1 text-sm">
        <button
          type="button"
          aria-label="Switch to sign in"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${
            mode === "signin" ? "bg-[#032147] text-white" : "text-gray-600"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          aria-label="Switch to sign up"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${
            mode === "signup" ? "bg-[#032147] text-white" : "text-gray-600"
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
          className="w-full rounded-md bg-[#753991] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5f2e75] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSubmitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </main>
  );
}
