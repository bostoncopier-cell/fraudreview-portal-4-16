"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";

function navLinkClass(isActive: boolean) {
  return isActive
    ? "inline-flex shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm md:px-4"
    : "inline-flex shrink-0 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white md:px-4";
}

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();

  const isAdmin =
    user?.primaryEmailAddress?.emailAddress?.toLowerCase() ===
    "bostoncopier@gmail.com";

  const isHome = pathname === "/";
  const isSubmit = pathname.startsWith("/submit");
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdminPage = pathname.startsWith("/admin");

  return (
    <header
      className="print:hidden sticky top-0 z-50 border-b border-white/10 backdrop-blur"
      style={{
        background: "linear-gradient(90deg, #334155 0%, #475569 100%)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 md:gap-4">
          <img
            src="/logo.png"
            alt="Fraud Review"
            className="h-10 w-auto md:h-16"
          />

          <div className="hidden sm:block">
            <p className="text-base font-semibold tracking-tight text-white">
              Secure Review System
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Fraud Review Portal
            </p>
          </div>
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          <nav className="flex max-w-[62vw] items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1 sm:max-w-none">
            <Link href="/" className={navLinkClass(isHome)}>
              Home
            </Link>

            {!isAdmin && (
              <Link href="/submit" className={navLinkClass(isSubmit)}>
                Submit
              </Link>
            )}

            <Link href="/dashboard" className={navLinkClass(isDashboard)}>
              Dashboard
            </Link>

            {isAdmin && (
              <Link href="/admin" className={navLinkClass(isAdminPage)}>
                Admin
              </Link>
            )}
          </nav>

          <div className="shrink-0 rounded-full border border-white/10 bg-white/5 p-1 shadow-sm">
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  );
}