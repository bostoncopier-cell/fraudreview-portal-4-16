import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";

type AIExtractedEntities = {
  sender?: string | null;
  subject?: string | null;
  urls?: string[];
  phone_numbers?: string[];
  emails?: string[];
  money_mentions?: string[];
  urgency_phrases?: string[];
};

type AIResult = {
  risk_level?: string | null;
  confidence?: number | null;
  summary?: string | null;
  signals_detected?: string[];
  recommended_human_actions?: string[];
  requires_escalation?: boolean | null;
  extracted_entities?: AIExtractedEntities | null;
  reasoning_summary?: string | null;
};

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

  final_risk_level?: string | null;
  report_summary?: string | null;
  recommendations?: string | null;
  expert_notes?: string | null;
  reviewer_name?: string | null;
  reviewer_title?: string | null;
  report_status?: string | null;

  ai_result_json?: AIResult | null;
};

function formatStatus(status: string | null) {
  const value = (status || "pending").toLowerCase();

  if (value === "pending") {
    return "bg-amber-50 text-amber-800 border border-amber-200";
  }

  if (value === "ai_processing") {
    return "bg-sky-50 text-sky-800 border border-sky-200";
  }

  if (value === "awaiting_human_review") {
    return "bg-violet-50 text-violet-800 border border-violet-200";
  }

  if (value === "in_review") {
    return "bg-indigo-50 text-indigo-800 border border-indigo-200";
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

function formatRiskLevel(riskLevel: string | null | undefined) {
  const value = (riskLevel || "").toLowerCase();

  if (value === "low") {
    return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  }

  if (value === "medium" || value === "moderate") {
    return "bg-amber-50 text-amber-800 border border-amber-200";
  }

  if (value === "high" || value === "critical") {
    return "bg-red-50 text-red-800 border border-red-200";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function getAdminStatusMessage(status: string | null) {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "This submission is waiting to begin the review workflow.";
    case "ai_processing":
      return "AI analysis is currently in progress for this submission.";
    case "awaiting_human_review":
      return "AI analysis has completed and the submission is ready for analyst review.";
    case "in_review":
      return "An analyst is actively reviewing this submission.";
    case "reviewed":
      return "This submission has been reviewed and updated.";
    case "flagged":
      return "This submission includes indicators that require caution.";
    case "escalated":
      return "This submission has been escalated for closer analysis.";
    default:
      return "Review progress is in motion.";
  }
}

function getDecisionGuidance(decision: string | null) {
  switch ((decision || "").toLowerCase()) {
    case "clear":
      return "Use when the submission does not show significant risk indicators based on the available information.";
    case "caution":
      return "Use when the submission shows warning signs that justify additional verification before action is taken.";
    case "suspicious":
      return "Use when the submission shows multiple or meaningful risk indicators that raise serious concern.";
    case "escalate":
      return "Use when the submission should receive further professional, institutional, or specialist review.";
    default:
      return "Choose a final decision when you are ready to communicate a clear review outcome to the user.";
  }
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderList(items: string[] | undefined | null, emptyText = "None") {
  if (!items || items.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "";
  const adminEmail = process.env.ADMIN_EMAIL || "";

  if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const submission = data as Submission;
  const ai = submission.ai_result_json;
  const extracted = ai?.extracted_entities;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Fraud Review Portal
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Admin Submission Detail
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Review the submission, inspect the AI synopsis, and finalize the
              outcome.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
  <a
    href="/admin"
    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
  >
    Back to Admin
  </a>

  <a
    href={`/admin/submissions/${submission.id}/report`}
    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
  >
    View / Print Report
  </a>
</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Submission Record
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {submission.file_name || "Unnamed file"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Reference ID: {submission.reference_id || "N/A"}
              </p>
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

              <div
                className={`inline-flex h-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${formatRiskLevel(
                  ai?.risk_level
                )}`}
              >
                AI Risk: {ai?.risk_level || "not available"}
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {getAdminStatusMessage(submission.status)}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Submission Overview
              </h3>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Reference ID</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {submission.reference_id || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Transaction Type</p>
                  <p className="mt-1 font-medium capitalize text-slate-900">
                    {submission.transaction_type || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Contact Email</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {submission.contact_email || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Attached File</p>
                  <p className="mt-1 break-all font-medium text-slate-900">
                    {submission.file_name || "No file attached"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    File name is currently stored and displayed here. A direct
                    file download link can be added once file storage URLs or
                    signed URLs are wired into the app.
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">User ID</p>
                  <p className="mt-1 break-all font-medium text-slate-900">
                    {submission.user_id || "N/A"}
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
                AI Risk Analysis
              </h3>

              {!ai ? (
                <p className="mt-4 text-sm text-slate-500">
                  No AI analysis is available yet for this submission.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Risk Level</p>
                      <div className="mt-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${formatRiskLevel(
                            ai.risk_level
                          )}`}
                        >
                          {ai.risk_level || "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Confidence</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">
                        {typeof ai.confidence === "number"
                          ? `${ai.confidence}%`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">
                      Summary
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {ai.summary || "No summary available."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">
                        Escalation Indicator
                      </p>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                          ai.requires_escalation
                            ? "border border-red-200 bg-red-50 text-red-800"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {ai.requires_escalation ? "Escalation Suggested" : "No Escalation Suggested"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">
                      Signals Detected
                    </p>
                    {renderList(ai.signals_detected, "No signals detected.")}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">
                      Recommended Human Actions
                    </p>
                    {renderList(
                      ai.recommended_human_actions,
                      "No recommended actions provided."
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">
                      Reasoning Summary
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {ai.reasoning_summary || "No reasoning summary available."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Extracted Entities
              </h3>

              {!extracted ? (
                <p className="mt-4 text-sm text-slate-500">
                  No extracted entities are available for this submission.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Sender</p>
                      <p className="mt-2 break-all text-sm font-medium text-slate-900">
                        {extracted.sender || "N/A"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Subject</p>
                      <p className="mt-2 break-words text-sm font-medium text-slate-900">
                        {extracted.subject || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">URLs</p>
                      {renderList(extracted.urls, "No URLs extracted.")}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">
                        Email Addresses
                      </p>
                      {renderList(extracted.emails, "No email addresses extracted.")}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">
                        Phone Numbers
                      </p>
                      {renderList(
                        extracted.phone_numbers,
                        "No phone numbers extracted."
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">
                        Money Mentions
                      </p>
                      {renderList(
                        extracted.money_mentions,
                        "No money mentions extracted."
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">
                      Urgency Phrases
                    </p>
                    {renderList(
                      extracted.urgency_phrases,
                      "No urgency phrases extracted."
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Current Review Snapshot
              </h3>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    Saved Final Decision
                  </p>
                  <div className="mt-3">
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
                  <p className="text-sm font-medium text-slate-900">
                    Decision Guidance
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {getDecisionGuidance(submission.final_decision)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    Saved Analyst Notes
                  </p>

                  {submission.review_notes ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {submission.review_notes}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      No analyst notes have been added yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Review Workspace
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
  Complete the fraud review workflow, finalize the risk assessment,
  document findings, and prepare the structured fraud review report.
</p>

            <form
              action="/api/admin/submissions"
              method="POST"
              className="mt-6 space-y-5"
            >
              <input type="hidden" name="id" value={String(submission.id)} />
              <input
                type="hidden"
                name="redirect_to"
                value={`/admin/submissions/${submission.id}`}
              />

              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-slate-900"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={submission.status || "pending"}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="pending">pending</option>
                  <option value="ai_processing">ai_processing</option>
                  <option value="awaiting_human_review">
                    awaiting_human_review
                  </option>
                  <option value="in_review">in_review</option>
                  <option value="reviewed">reviewed</option>
                  <option value="flagged">flagged</option>
                  <option value="escalated">escalated</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="final_decision"
                  className="block text-sm font-medium text-slate-900"
                >
                  Final Decision
                </label>
                <select
                  id="final_decision"
                  name="final_decision"
                  defaultValue={submission.final_decision || ""}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Not set</option>
                  <option value="clear">clear</option>
                  <option value="caution">caution</option>
                  <option value="suspicious">suspicious</option>
                  <option value="escalate">escalate</option>
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  AI Snapshot for Analyst
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">
                      Risk Level:
                    </span>{" "}
                    {ai?.risk_level || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">
                      Confidence:
                    </span>{" "}
                    {typeof ai?.confidence === "number"
                      ? `${ai.confidence}%`
                      : "N/A"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">
                      Escalation Suggested:
                    </span>{" "}
                    {ai?.requires_escalation ? "Yes" : "No"}
                  </p>
                </div>
              </div>
<div>
  <label
    htmlFor="final_risk_level"
    className="block text-sm font-medium text-slate-900"
  >
    Final Risk Level
  </label>

  <select
    id="final_risk_level"
    name="final_risk_level"
    defaultValue={submission.final_risk_level || ""}
    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
  >
    <option value="">Not set</option>
    <option value="Low Risk">Low Risk</option>
    <option value="Moderate Risk">Moderate Risk</option>
    <option value="Elevated Risk">Elevated Risk</option>
    <option value="High Risk">High Risk</option>
    <option value="Critical Risk">Critical Risk</option>
  </select>
</div>
<div>
  <label
    htmlFor="report_summary"
    className="block text-sm font-medium text-slate-900"
  >
    Executive Summary
  </label>

  <textarea
    id="report_summary"
    name="report_summary"
    defaultValue={submission.report_summary || ai?.summary || ""}
    placeholder="Summarize the overall findings and fraud concerns..."
    className="mt-2 min-h-[180px] w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900"
  />
</div>
<div>
  <label
    htmlFor="recommendations"
    className="block text-sm font-medium text-slate-900"
  >
    Recommendations & Remediation
  </label>

  <textarea
    id="recommendations"
    name="recommendations"
    defaultValue={
  submission.recommendations ||
  [
    ai?.requires_escalation
      ? "Escalate this submission for additional verification and specialist review."
      : null,

    ...(ai?.recommended_human_actions || []),

    ai?.signals_detected?.includes("payment_change_request")
      ? "Independently verify all payment instruction changes using a trusted phone number or verified contact method."
      : null,

    ai?.signals_detected?.includes("urgency_language")
      ? "Do not act under pressure or urgency without secondary verification."
      : null,

    ai?.signals_detected?.includes("suspicious_domain")
      ? "Verify sender domain legitimacy and inspect for impersonation indicators."
      : null,
  ]
    .filter(Boolean)
    .join("\n\n")
}
    placeholder="Document recommended actions, verification steps, escalation guidance, or remediation recommendations..."
    className="mt-2 min-h-[220px] w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900"
  />
</div>
<div>
  <label
    htmlFor="expert_notes"
    className="block text-sm font-medium text-slate-900"
  >
    Fraud Expert Notes
  </label>

  <textarea
    id="expert_notes"
    name="expert_notes"
    defaultValue={
  submission.expert_notes ||
  [
    ai?.reasoning_summary
      ? `AI Review Summary:\n${ai.reasoning_summary}`
      : null,

    ai?.signals_detected?.length
      ? `\nPotential Risk Indicators:\n- ${ai.signals_detected.join("\n- ")}`
      : null,

    extracted?.sender
      ? `\nSender Observed:\n${extracted.sender}`
      : null,

    extracted?.subject
      ? `\nEmail Subject:\n${extracted.subject}`
      : null,

    ai?.requires_escalation
      ? `\nEscalation Consideration:\nAI analysis suggests this submission may warrant additional review or verification before action is taken.`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n")
}
    placeholder="Add expert review commentary, contextual observations, and professional findings..."
    className="mt-2 min-h-[220px] w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900"
  />
</div>
<div className="grid gap-5 sm:grid-cols-2">
  <div>
    <label
      htmlFor="reviewer_name"
      className="block text-sm font-medium text-slate-900"
    >
      Reviewer Name
    </label>

    <input
      id="reviewer_name"
      name="reviewer_name"
      defaultValue={submission.reviewer_name || ""}
      placeholder="Reviewer name"
      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
    />
  </div>

  <div>
    <label
      htmlFor="reviewer_title"
      className="block text-sm font-medium text-slate-900"
    >
      Reviewer Title
    </label>

    <input
      id="reviewer_title"
      name="reviewer_title"
      defaultValue={submission.reviewer_title || ""}
      placeholder="Certified Fraud Examiner"
      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
    />
  </div>
</div>
              <div>
                <label
                  htmlFor="review_notes"
                  className="block text-sm font-medium text-slate-900"
                >
                  Analyst Notes
                </label>
                <textarea
                  id="review_notes"
                  name="review_notes"
                  defaultValue={submission.review_notes || ""}
                  placeholder="Add analyst notes, findings, and review commentary..."
                  className="mt-2 min-h-[220px] w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900"
                />
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Review Reminder
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Keep notes factual, concise, and useful to the user. Final
                  decisions should reflect the available evidence without
                  overstating certainty.
                </p>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Fraud Review Report
              </button>
            </form>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Extracted Entity Snapshot
              </h4>

              {!extracted ? (
                <p className="mt-3 text-sm text-slate-500">
                  No extracted entity data is available yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  {Object.entries(extracted).map(([key, value]) => {
                    let renderedValue: string;

                    if (Array.isArray(value)) {
                      renderedValue = value.length > 0 ? value.join(", ") : "None";
                    } else if (value === null || value === undefined || value === "") {
                      renderedValue = "N/A";
                    } else {
                      renderedValue = String(value);
                    }

                    return (
                      <div key={key}>
                        <p className="font-medium text-slate-900">
                          {formatLabel(key)}
                        </p>
                        <p className="mt-1 break-words text-slate-700">
                          {renderedValue}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}