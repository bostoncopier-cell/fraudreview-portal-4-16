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

function getStatusMessage(status: string | null) {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "Your submission has been received and is awaiting review.";
    case "reviewed":
      return "Your submission has been reviewed by our team.";
    case "flagged":
      return "Your submission contains indicators that deserve closer attention.";
    case "escalated":
      return "Your submission has been escalated for further analysis.";
    default:
      return "Your submission is being processed.";
  }
}

function getNextStepMessage(decision: string | null, status: string | null) {
  const normalizedDecision = (decision || "").toLowerCase();
  const normalizedStatus = (status || "").toLowerCase();

  if (!normalizedDecision) {
    if (normalizedStatus === "pending") {
      return "No action is needed right now. Our team is still reviewing your submission.";
    }

    if (normalizedStatus === "escalated") {
      return "Your submission is receiving additional attention. Please wait for the review process to continue.";
    }

    return "A final recommendation will appear here once the review is complete.";
  }

  switch (normalizedDecision) {
    case "clear":
      return "No significant issues were identified. You may proceed, but continue using normal caution and verification.";
    case "caution":
      return "Some warning signs were detected. We recommend verifying all details carefully before taking further action.";
    case "suspicious":
      return "Multiple risk indicators were identified. Proceed very carefully and independently verify all information before responding or sending funds.";
    case "escalate":
      return "Further review is recommended before taking action. Consider pausing the transaction until additional verification is completed.";
    default:
      return "A final recommendation will appear here once the review is complete.";
  }
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
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Fraud Review Portal
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Submission Detail
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Review the status and outcome of your submission.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Submission Details
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            {submission.file_name || "Submitted File"}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Reference ID: {submission.reference_id}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Review Status</h3>

          <div className="mt-4 flex flex-wrap gap-3">
            <div
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${formatStatus(
                submission.status
              )}`}
            >
              {submission.status || "pending"}
            </div>

            <div
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${formatDecision(
                submission.final_decision
              )}`}
            >
              {submission.final_decision || "no decision"}
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {getStatusMessage(submission.status)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Submission Overview
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Submitted</p>
              <p className="mt-1 font-medium text-slate-900">
                {submission.created_at
                  ? new Date(submission.created_at).toLocaleString()
                  : "N/A"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Contact Email</p>
              <p className="mt-1 font-medium text-slate-900">
                {submission.contact_email || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Transaction Type</p>
              <p className="mt-1 font-medium capitalize text-slate-900">
                {submission.transaction_type || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Reference ID</p>
              <p className="mt-1 font-medium text-slate-900">
                {submission.reference_id || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Analyst Notes</h3>

          {submission.review_notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {submission.review_notes}
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No notes have been added yet. Once your review is complete, any relevant notes will appear here.
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Recommended Next Step
          </h3>

          <p className="mt-4 text-sm leading-6 text-slate-700">
            {getNextStepMessage(submission.final_decision, submission.status)}
          </p>
        </div>
      </div>
    </main>
  );
}