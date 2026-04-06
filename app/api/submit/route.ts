import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

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

    const { error: insertError } = await supabase.from("submissions").insert({
      user_id: userId,
      reference_id: submissionId,
      contact_email: contactEmail,
      transaction_type: transactionType,
      file_name: file.name,
      status: "pending",
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