import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);

function getTransactionLabel(transactionType: string) {
  return transactionType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function sendSubmissionConfirmationEmail({
  to,
  referenceId,
  fileName,
  transactionType,
  requestUrl,
}: {
  to: string;
  referenceId: string;
  fileName: string;
  transactionType: string;
  requestUrl: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(requestUrl).origin;

  const dashboardUrl = `${appUrl}/dashboard`;

  return await resend.emails.send({
    from: "Fraud Review <onboarding@resend.dev>",
    to: [to],
    subject: "We received your Fraud Review submission",
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">We received your submission</h2>

        <p>Thank you. Your submission has been received and added to the review queue.</p>

        <div style="margin: 20px 0; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
          <p style="margin: 0 0 8px;"><strong>Reference ID:</strong> ${referenceId}</p>
          <p style="margin: 0 0 8px;"><strong>File:</strong> ${fileName}</p>
          <p style="margin: 0;"><strong>Transaction Type:</strong> ${getTransactionLabel(transactionType)}</p>
        </div>

        <p>Your submission is currently marked as <strong>Pending</strong>. We will notify you when your review has been updated.</p>

        <p style="margin-top: 20px;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 10px 16px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px;">
            View Dashboard
          </a>
        </p>
      </div>
    `,
  });
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const transactionType = formData.get("transaction_type");
    const contactEmail = formData.get("contact_email");
    const notes = formData.get("notes");
    const file = formData.get("file");

    if (
      typeof transactionType !== "string" ||
      typeof contactEmail !== "string" ||
      typeof notes !== "string" ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { detail: "Invalid form submission." },
        { status: 400 }
      );
    }

    const backendUrl = process.env.FASTAPI_BACKEND_URL;

    if (!backendUrl) {
      return NextResponse.json(
        { detail: "Missing FASTAPI_BACKEND_URL" },
        { status: 500 }
      );
    }

    const backendFormData = new FormData();
    backendFormData.append("transaction_type", transactionType);
    backendFormData.append("contact_email", contactEmail);
    backendFormData.append("notes", notes);
    backendFormData.append("files", file);

    const backendResponse = await fetch(`${backendUrl}/api/submit`, {
      method: "POST",
      body: backendFormData,
    });

    const rawText = await backendResponse.text();
    console.log("FASTAPI RAW RESPONSE:", rawText);

    let backendData: any = null;
    

    try {
      backendData = rawText ? JSON.parse(rawText) : null;
    } catch {
      backendData = { detail: rawText || "Unexpected response from backend." };
    }

    if (!backendResponse.ok) {
      const detail =
        typeof backendData?.detail === "string"
          ? backendData.detail
          : backendData?.detail
            ? JSON.stringify(backendData.detail)
            : "Upload failed.";

      return NextResponse.json({ detail }, { status: backendResponse.status });
    }

    const submissionId = backendData?.submission_id || crypto.randomUUID();

    const supabase = createAdminClient();

    const aiResult =
  backendData?.ai_result ||
  backendData?.ai_result_json ||
  backendData?.analysis ||
  backendData?.result ||
  null;

const { error: insertError } = await supabase.from("submissions").insert({
  user_id: userId,
  reference_id: submissionId,
  contact_email: contactEmail,
  transaction_type: transactionType,
  file_name: file.name,
  status: aiResult ? "awaiting_human_review" : "pending",
  ai_result_json: aiResult,
  created_at: new Date().toISOString(),
});

    if (insertError) {
      return NextResponse.json(
        {
          detail: `Backend succeeded, but Supabase insert failed: ${insertError.message}`,
        },
        { status: 500 }
      );
    }

    if (contactEmail.trim()) {
      try {
        const recipient =
          process.env.NODE_ENV === "development"
            ? "bostoncopier@gmail.com"
            : contactEmail.trim();

        const emailResult = await sendSubmissionConfirmationEmail({
          to: recipient,
          referenceId: submissionId,
          fileName: file.name,
          transactionType,
          requestUrl: request.url,
        });

        console.log("SUBMISSION EMAIL RESULT:", emailResult);
      } catch (emailError) {
        console.error("Submission confirmation email failed:", emailError);
      }
    }

    return NextResponse.json({
      message:
        backendData?.message ||
        "Your file was submitted successfully and flagged for specialist review before any guidance is provided.",
      submission_id: submissionId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json({ detail: message }, { status: 500 });
  }
}