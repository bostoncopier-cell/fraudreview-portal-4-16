import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 1. Verify internal secret (NO Clerk here)
    const authHeader = req.headers.get("authorization");

    if (!authHeader || authHeader !== `Bearer ${INTERNAL_API_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 📦 2. Get submission ID
    const { id } = await params;
    const submissionId = Number(id);

    if (Number.isNaN(submissionId)) {
      return NextResponse.json(
        { error: "Invalid submission id" },
        { status: 400 }
      );
    }

    // 📥 3. Parse body
    const body = await req.json();
    const aiResult = body?.ai_result;

    if (!aiResult || typeof aiResult !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid ai_result" },
        { status: 400 }
      );
    }

    // 🔍 4. Fetch current submission
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
        { error: "Submission is deleted" },
        { status: 400 }
      );
    }

    // 🚦 5. Validate current status
    if (submission.status !== "ai_processing") {
      return NextResponse.json(
        {
          error: `Invalid status transition. Expected ai_processing but got ${submission.status}`,
        },
        { status: 400 }
      );
    }

    // 💾 6. Update submission
    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        ai_result_json: aiResult,
        status: "awaiting_human_review",
      })
      .eq("id", submissionId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // 🧾 7. Audit log
    await writeAuditLog({
      submissionId,
      actorUserId: null,
      actorEmail: null,
      actorRole: "ai",
      action: "ai_result_saved",
      oldValue: {
        status: submission.status,
      },
      newValue: {
        status: "awaiting_human_review",
        ai_result_json: aiResult,
      },
      metadata: {
        source: "app/api/internal/submissions/[id]/ai-complete/route.ts",
      },
    });

    // 🔄 8. Revalidate UI
    revalidatePath("/admin");
    revalidatePath(`/admin/submissions/${submissionId}`);
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/submissions/${submissionId}`);

    return NextResponse.json({
      success: true,
      submissionId,
      newStatus: "awaiting_human_review",
    });
  } catch (error) {
    console.error("AI complete route failed:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}