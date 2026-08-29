"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthUser } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/", label: "Document Creator" },
  { href: "/history", label: "History" },
];

export default function AppHeader({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="text-lg font-bold text-brand-navy">Prelegal</span>
          <nav className="flex gap-1 text-sm">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                    isActive ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Signed in as {user.email}</span>
          <button type="button" onClick={onLogout} className="underline hover:text-gray-700">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
