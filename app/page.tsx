import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import LogoBadge from "@/app/components/logo-badge";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="px-4 py-20 md:px-6 mt-6">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Human-in-the-loop fraud screening
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Before you send money, get it reviewed.
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Fraud Review Portal helps users submit suspicious invoices, wire
              instructions, payment requests, and supporting files for
              structured analysis and specialist review before action is taken.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Start a Submission
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              >
                View Dashboard
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">
                  Upload suspicious files
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Support for email files, PDFs, screenshots, and images.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">
                  Structured risk review
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Surface suspicious patterns before funds are moved.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">
                  Specialist oversight
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Keep results gated behind human review for safer decisions.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <LogoBadge size={48} />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Review workflow
                </p>
                <h3 className="text-2xl font-semibold text-slate-900">
                  How it works
                </h3>
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-slate-700" />
                <div>
                  <p className="font-medium text-slate-900">
                    1. Submit suspicious material
                  </p>
                  <p className="text-sm text-slate-600">
                    Upload a questionable invoice, payment request, email, or
                    screenshot.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-slate-700" />
                <div>
                  <p className="font-medium text-slate-900">
                    2. Analyze indicators
                  </p>
                  <p className="text-sm text-slate-600">
                    The system reviews for urgency language, sender mismatches,
                    changed instructions, and other fraud markers.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-slate-700" />
                <div>
                  <p className="font-medium text-slate-900">
                    3. Hold for specialist review
                  </p>
                  <p className="text-sm text-slate-600">
                    Results stay conservative and are reviewed before final
                    guidance is delivered.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-slate-700" />
                <div>
                  <p className="font-medium text-slate-900">
                    4. Track activity in your dashboard
                  </p>
                  <p className="text-sm text-slate-600">
                    View submissions, statuses, and reference IDs in one place.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">
                Built for conservative decision support
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The goal is not to create false confidence. The goal is to slow
                risky decisions down and support informed action before money
                moves.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}