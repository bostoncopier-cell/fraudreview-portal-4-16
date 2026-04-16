"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

function navLinkClass(isActive: boolean) {
  return isActive
    ? "inline-flex items-center justify-center rounded-xl border border-white/20 bg-white text-slate-900 px-4 py-2 text-sm font-semibold shadow-sm"
    : "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white";
}

export default function Navbar() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isSubmit = pathname.startsWith("/submit");
  const isDashboard =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="Fraud Review"
            className="h-16 w-auto"
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

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
            <Link href="/" className={navLinkClass(isHome)}>
              Home
            </Link>

            <Link href="/submit" className={navLinkClass(isSubmit)}>
              Submit
            </Link>

            <Link href="/dashboard" className={navLinkClass(isDashboard)}>
              Dashboard
            </Link>
          </nav>

          <div className="ml-1 rounded-full border border-white/10 bg-white/5 p-1 shadow-sm">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
}