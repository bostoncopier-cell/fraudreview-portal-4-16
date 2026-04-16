import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["ai_processing", "flagged", "escalated"],
  ai_processing: ["awaiting_human_review", "flagged", "escalated"],
  awaiting_human_review: ["in_review", "flagged", "escalated"],
  in_review: ["reviewed", "flagged", "escalated"],
  reviewed: ["flagged", "escalated"],
  flagged: ["in_review", "reviewed", "escalated"],
  escalated: ["in_review", "reviewed", "flagged"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email =
      user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() ?? "";

    if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const submissionId = Number(id);

    if (Number.isNaN(submissionId)) {
      return NextResponse.json(
        { error: "Invalid submission id" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const nextStatus = body?.status;

    if (!nextStatus || typeof nextStatus !== "string") {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }

    const { data: submission, error: fetchError } = await supabase
      .from("submissions")
      .select("id, status, deleted_at")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.deleted_at) {
      return NextResponse.json(
        { error: "Cannot change status of deleted submission" },
        { status: 400 }
      );
    }

    const currentStatus = submission.status;
    const allowedTransitions =
      ADMIN_ALLOWED_TRANSITIONS[currentStatus] ?? [];

    if (!allowedTransitions.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: `Invalid transition from ${currentStatus} to ${nextStatus}`,
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("submissions")
      .update({ status: nextStatus })
      .eq("id", submissionId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    await writeAuditLog({
      submissionId,
      actorUserId: userId,
      actorEmail: email,
      actorRole: "admin",
      action: "status_changed",
      oldValue: { status: currentStatus },
      newValue: { status: nextStatus },
      metadata: {
        source: "app/api/admin/submissions/[id]/status/route.ts",
      },
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/submissions/${submissionId}`);

    return NextResponse.json({
      success: true,
      submissionId,
      oldStatus: currentStatus,
      newStatus: nextStatus,
    });
  } catch (error) {
    console.error("Admin status update failed:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}