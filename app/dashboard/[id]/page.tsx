import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

type Submission = {
  id: string | number;
  user_id: string;
  reference_id: string;
  contact_email: string | null;
  transaction_type: string | null;
  file_name: string | null;
  status: string | null;
  created_at: string | null;
  review_notes?: string | null;
  final_decision?: string | null;
};

function formatStatus(status: string | null) {
  const value = (status || "pending").toLowerCase();

  if (value === "pending") {
    return "bg-amber-50 text-amber-800 border border-amber-200";
  }

  if (value === "reviewed") {
    return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  }

  if (value === "flagged" || value === "escalated") {
    return "bg-red-50 text-red-800 border border-red-200";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function formatDecision(decision: string | null) {
  const value = (decision || "").toLowerCase();

  if (value === "clear") {
    return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  }

  if (value === "caution") {
    return "bg-amber-50 text-amber-800 border border-amber-200";
  }

  if (value === "suspicious" || value === "escalate") {
    return "bg-red-50 text-red-800 border border-red-200";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200";
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const supabase = await createClient();

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
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Fraud Review Portal
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Submission Detail
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Review the full details of this submission.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-slate-500">File name</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  {submission.file_name || "Unnamed file"}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <div
                  className={`inline-flex h-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${formatStatus(
                    submission.status
                  )}`}
                >
                  Status: {submission.status || "pending"}
                </div>

                <div
                  className={`inline-flex h-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${formatDecision(
                    submission.final_decision
                  )}`}
                >
                  Decision: {submission.final_decision || "not set"}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Submission info
              </h3>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Reference ID</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {submission.reference_id || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Transaction type</p>
                  <p className="mt-1 font-medium text-slate-900 capitalize">
                    {submission.transaction_type || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Contact email</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {submission.contact_email || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Submitted</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {submission.created_at
                      ? new Date(submission.created_at).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Review summary
              </h3>

              <div className="mt-5 space-y-4 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">Final decision</p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${formatDecision(
                        submission.final_decision
                      )}`}
                    >
                      {submission.final_decision || "not set"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">Analyst notes</p>
                  {submission.review_notes ? (
                    <p className="mt-2 whitespace-pre-wrap text-slate-700">
                      {submission.review_notes}
                    </p>
                  ) : (
                    <p className="mt-2 text-slate-500">
                      No analyst notes have been added yet.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">
                    Placeholder: AI summary
                  </p>
                  <p className="mt-2">
                    No structured analysis has been saved to this record yet.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              What comes next
            </h3>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>Next upgrade ideas for this page:</p>
              <p>• Risk signals and AI summary</p>
              <p>• Admin-only review actions</p>
              <p>• Supporting documents or attachments</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}