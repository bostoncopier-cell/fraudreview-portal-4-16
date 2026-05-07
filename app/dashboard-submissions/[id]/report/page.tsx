import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import ReportButtons from "@/app/components/ReportButtons";

type Submission = {
  id: string | number;
  user_id: string;
  reference_id: string;
  contact_email: string | null;
  transaction_type: string | null;
  file_name: string | null;
  status: string | null;
  final_decision: string | null;
  final_risk_level: string | null;
  report_summary: string | null;
  recommendations: string | null;
  expert_notes: string | null;
  reviewer_name: string | null;
  reviewer_title: string | null;
  reviewed_at: string | null;
  report_status: string | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

export default async function CustomerSubmissionReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    notFound();
  }

  const submission = data as Submission;

  return (
    <main className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div
  id="fraud-report"
  className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-sm print:rounded-none print:shadow-none"
>
        <div className="mb-6 flex items-center justify-between print:hidden">
          <a
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900"
          >
            Back to Dashboard
          </a>

          <ReportButtons />
        </div>

        <section className="border-b border-slate-300 pb-6">
          <div className="mb-6 flex justify-center">
  <img
    src="/logo.png"
    alt="Fraud Review"
    className="w-[420px] max-w-full h-auto print:block"
  />
</div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            Fraud Risk Level
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Fraud-Risk Assessment Report
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Confidential customer report prepared for the submitted fraud review matter.
          </p>

          <div className="mt-6 grid gap-3 border border-slate-200 text-sm sm:grid-cols-2">
            <div className="border-b border-slate-200 p-3 sm:border-r">
              <strong>Case Number:</strong> {submission.reference_id || "N/A"}
            </div>
            <div className="border-b border-slate-200 p-3">
              <strong>Report Date:</strong> {formatDate(new Date().toISOString())}
            </div>
            <div className="border-b border-slate-200 p-3 sm:border-r">
              <strong>Prepared For:</strong> {submission.contact_email || "N/A"}
            </div>
            <div className="border-b border-slate-200 p-3">
              <strong>Prepared By:</strong> Fraud Risk Level
            </div>
            <div className="p-3 sm:border-r">
              <strong>Reviewer:</strong> {submission.reviewer_name || "Fraud Review Specialist"}
            </div>
            <div className="p-3">
              <strong>Reviewer Title:</strong> {submission.reviewer_title || "Fraud Review Specialist"}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">
            Overall Risk Level
          </p>
          <h2 className="mt-2 text-4xl font-bold text-red-800">
            {submission.final_risk_level || "Not Set"}
          </h2>
          <p className="mt-2 text-sm text-red-800">
            Final Decision: {submission.final_decision || "Not set"}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-950">Executive Summary</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {submission.report_summary || "No executive summary has been added yet."}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-950">Scope of Review</h2>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
            <p>
              Fraud Risk Level reviewed the submitted materials associated with this case,
              including available file information, transaction context, AI analysis, and
              fraud review notes.
            </p>
            <p className="mt-3">
              <strong>Transaction Type:</strong> {submission.transaction_type || "N/A"}
            </p>
            <p>
              <strong>Submitted File:</strong> {submission.file_name || "N/A"}
            </p>
            <p>
              <strong>Submitted:</strong>{" "}
              {submission.created_at
                ? new Date(submission.created_at).toLocaleString()
                : "N/A"}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-950">Review Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {submission.expert_notes || "No review notes have been added yet."}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-950">
            Recommendations & Remediation
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {submission.recommendations || "No recommendations have been added yet."}
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            Review Limitations / Liability Statement
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            This report identifies fraud indicators, inconsistencies, and observed
            risk concerns based on the materials reviewed. It is not a legal opinion,
            financial guarantee, law-enforcement determination, or final finding that
            fraud has or has not occurred. Additional records, technical data,
            third-party confirmations, or legal review may change the assessment.
          </p>
        </section>

        <section className="mt-10 border-t border-slate-300 pt-6">
          <h2 className="text-xl font-bold text-slate-950">Reviewer Signoff</h2>

          <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-slate-500">Reviewed By</p>
              <p className="mt-1 font-medium text-slate-900">
                {submission.reviewer_name || "Fraud Review Specialist"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Title</p>
              <p className="mt-1 font-medium text-slate-900">
                {submission.reviewer_title || "Fraud Review Specialist"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Date Reviewed</p>
              <p className="mt-1 font-medium text-slate-900">
                {formatDate(submission.reviewed_at || new Date().toISOString())}
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
          Page 1 | {submission.reference_id || "N/A"} | Confidential Fraud Review Report
        </footer>
      </div>
    </main>
  );
}