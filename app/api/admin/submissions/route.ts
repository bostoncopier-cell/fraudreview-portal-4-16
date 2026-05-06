import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);

type SubmissionRecord = {
  id: string | number;
  reference_id: string;
  contact_email: string | null;
  file_name: string | null;
  status: string | null;
  final_decision: string | null;
};

function getDecisionLabel(decision: string | null) {
  switch ((decision || "").toLowerCase()) {
    case "clear":
      return "Clear";
    case "caution":
      return "Caution";
    case "suspicious":
      return "Suspicious";
    case "escalate":
      return "Escalate";
    default:
      return "Not set";
  }
}

function getStatusLabel(status: string | null) {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "Pending";
    case "reviewed":
      return "Reviewed";
    case "flagged":
      return "Flagged";
    case "escalated":
      return "Escalated";
    default:
      return "Pending";
  }
}

function getEmailSummary(status: string | null, decision: string | null) {
  const normalizedDecision = (decision || "").toLowerCase();
  const normalizedStatus = (status || "").toLowerCase();

  if (normalizedDecision === "clear") {
    return "Your submission has been reviewed and no significant issues were identified based on the available information.";
  }

  if (normalizedDecision === "caution") {
    return "Your submission has been reviewed and some warning signs were identified. Additional verification is recommended before proceeding.";
  }

  if (normalizedDecision === "suspicious") {
    return "Your submission has been reviewed and multiple risk indicators were identified. Proceed carefully and verify all details independently.";
  }

  if (normalizedDecision === "escalate") {
    return "Your submission has been reviewed and further professional or institutional review is recommended before taking action.";
  }

  if (normalizedStatus === "reviewed") {
    return "Your submission has been reviewed and your record has been updated.";
  }

  return "Your submission record has been updated.";
}

async function sendReviewUpdateEmail({
  to,
  referenceId,
  fileName,
  status,
  finalDecision,
  requestUrl,
}: {
  to: string;
  referenceId: string;
  fileName: string | null;
  status: string | null;
  finalDecision: string | null;
  requestUrl: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(requestUrl).origin;

  const detailUrl = `${appUrl}/dashboard`;
  const subject = `Your Fraud Review submission has been updated`;
  const summary = getEmailSummary(status, finalDecision);

  return await resend.emails.send({
    from: "Fraud Review <onboarding@resend.dev>",
    to: [to],
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Your submission has been updated</h2>

        <p>${summary}</p>

        <div style="margin: 20px 0; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
          <p style="margin: 0 0 8px;"><strong>Reference ID:</strong> ${referenceId}</p>
          <p style="margin: 0 0 8px;"><strong>File:</strong> ${fileName || "Submitted file"}</p>
          <p style="margin: 0 0 8px;"><strong>Status:</strong> ${getStatusLabel(status)}</p>
          <p style="margin: 0;"><strong>Final Decision:</strong> ${getDecisionLabel(finalDecision)}</p>
        </div>

        <p>You can sign in to your dashboard to review the latest details.</p>

        <p style="margin-top: 20px;">
          <a href="${detailUrl}" style="display: inline-block; padding: 10px 16px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px;">
            View Dashboard
          </a>
        </p>
      </div>
    `,
  });
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || "";
    const adminEmail = process.env.ADMIN_EMAIL || "";

    if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ submissions: data || [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", request.url), 303);
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || "";
    const adminEmail = process.env.ADMIN_EMAIL || "";

    if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.redirect(new URL("/dashboard", request.url), 303);
    }

    const formData = await request.formData();

    const id = formData.get("id");
    const status = formData.get("status");
    const reviewNotes = formData.get("review_notes");
    const finalDecision = formData.get("final_decision");
    const redirectTo = formData.get("redirect_to");
    const finalRiskLevel = formData.get("final_risk_level");
const reportSummary = formData.get("report_summary");
const recommendations = formData.get("recommendations");
const expertNotes = formData.get("expert_notes");
const reviewerName = formData.get("reviewer_name");
const reviewerTitle = formData.get("reviewer_title");

    if (typeof id !== "string" || !id) {
      return NextResponse.json({ detail: "Invalid request." }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};

    if (typeof status === "string" && status) {
      const allowedStatuses = ["pending", "reviewed", "flagged", "escalated"];

      if (!allowedStatuses.includes(status)) {
        return NextResponse.json({ detail: "Invalid status." }, { status: 400 });
      }

      updates.status = status;
    }

    if (typeof reviewNotes === "string") {
      updates.review_notes = reviewNotes;
    }

    if (typeof finalDecision === "string") {
      const allowedDecisions = ["", "clear", "caution", "suspicious", "escalate"];

      if (!allowedDecisions.includes(finalDecision)) {
        return NextResponse.json(
          { detail: "Invalid final decision." },
          { status: 400 }
        );
      }
      if (typeof finalRiskLevel === "string") {
  updates.final_risk_level = finalRiskLevel;
}

if (typeof reportSummary === "string") {
  updates.report_summary = reportSummary;
}

if (typeof recommendations === "string") {
  updates.recommendations = recommendations;
}

if (typeof expertNotes === "string") {
  updates.expert_notes = expertNotes;
}

if (typeof reviewerName === "string") {
  updates.reviewer_name = reviewerName;
}

if (typeof reviewerTitle === "string") {
  updates.reviewer_title = reviewerTitle;
}

updates.report_status = "draft";

      updates.final_decision = finalDecision;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { detail: "No update values provided." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: updatedSubmission, error } = await supabase
      .from("submissions")
      .update(updates)
      .eq("id", id)
      .select("id, reference_id, contact_email, file_name, status, final_decision")
      .single<SubmissionRecord>();

    if (error) {
      return NextResponse.json(
        { detail: `Update failed: ${error.message}` },
        { status: 500 }
      );
    }

    const shouldSendEmail =
      !!updatedSubmission?.contact_email &&
      (
        (updatedSubmission.final_decision || "").trim() !== "" ||
        (updatedSubmission.status || "").toLowerCase() === "reviewed"
      );

    if (shouldSendEmail && updatedSubmission.contact_email) {
      try {
        const recipient =
          process.env.NODE_ENV === "development"
            ? "bostoncopier@gmail.com"
            : updatedSubmission.contact_email;

        const emailResult = await sendReviewUpdateEmail({
          to: recipient,
          referenceId: updatedSubmission.reference_id,
          fileName: updatedSubmission.file_name,
          status: updatedSubmission.status,
          finalDecision: updatedSubmission.final_decision,
          requestUrl: request.url,
        });

        console.log("EMAIL RESULT:", emailResult);
      } catch (emailError) {
        console.error("Review update email failed:", emailError);
      }
    }

    const safeRedirect =
      typeof redirectTo === "string" && redirectTo.startsWith("/")
        ? redirectTo
        : "/admin";

    return NextResponse.redirect(new URL(safeRedirect, request.url), 303);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}