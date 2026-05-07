"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

function navLinkClass(isActive: boolean) {
  return isActive
    ? "inline-flex items-center justify-center rounded-xl border border-white/20 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm"
    : "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white";
}

function mobileNavLinkClass(isActive: boolean) {
  return isActive
    ? "block rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
    : "block rounded-xl px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10";
}

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <img
            src="/logo.png"
            alt="Fraud Review"
            className="h-14 w-auto sm:h-16"
          />

          <div className="hidden md:block">
            <p className="text-base font-semibold tracking-tight text-white">
              Secure Review System
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Fraud Review Portal
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
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

          <div className="rounded-full border border-white/10 bg-white/5 p-1 shadow-sm">
            <UserButton />
          </div>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <div className="rounded-full border border-white/10 bg-white/5 p-1 shadow-sm">
            <UserButton />
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 px-4 pb-4 md:hidden">
          <nav className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-2">
            <Link
              href="/"
              className={mobileNavLinkClass(isHome)}
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>

            {!isAdmin && (
              <Link
                href="/submit"
                className={mobileNavLinkClass(isSubmit)}
                onClick={() => setMobileOpen(false)}
              >
                Submit
              </Link>
            )}

            <Link
              href="/dashboard"
              className={mobileNavLinkClass(isDashboard)}
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className={mobileNavLinkClass(isAdminPage)}
                onClick={() => setMobileOpen(false)}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}