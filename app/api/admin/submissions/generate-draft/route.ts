import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

function normalizeRiskLevel(riskLevel: string | null | undefined) {
  const value = (riskLevel || "").toLowerCase();

  if (value.includes("critical")) return "Critical Risk";
  if (value.includes("high")) return "High Risk";
  if (value.includes("moderate") || value.includes("medium")) return "Moderate Risk";
  if (value.includes("elevated")) return "Elevated Risk";
  if (value.includes("low")) return "Low Risk";

  return "Moderate Risk";
}

function normalizeDecision(riskLevel: string | null | undefined, requiresEscalation?: boolean | null) {
  const value = (riskLevel || "").toLowerCase();

  if (requiresEscalation || value.includes("critical") || value.includes("high")) {
    return "suspicious";
  }

  if (value.includes("moderate") || value.includes("medium") || value.includes("elevated")) {
    return "caution";
  }

  if (value.includes("low")) {
    return "clear";
  }

  return "caution";
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

    if (typeof id !== "string" || !id) {
      return NextResponse.json({ detail: "Missing submission ID." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ detail: "Submission not found." }, { status: 404 });
    }

    const ai = data.ai_result_json || {};

    const riskLevel = normalizeRiskLevel(ai.risk_level);
    const finalDecision = normalizeDecision(ai.risk_level, ai.requires_escalation);

    const summary =
      ai.summary ||
      ai.reasoning_summary ||
      "Based on the available materials, this submission was reviewed for fraud indicators, inconsistencies, and risk concerns.";

    const expertNotes = [
      ai.reasoning_summary ? `AI Review Summary:\n${ai.reasoning_summary}` : null,
      Array.isArray(ai.signals_detected) && ai.signals_detected.length
        ? `Potential Risk Indicators:\n- ${ai.signals_detected.join("\n- ")}`
        : null,
      ai.requires_escalation
        ? "Escalation Consideration:\nThis submission may warrant additional verification or specialist review before action is taken."
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const recommendations = [
      ai.requires_escalation
        ? "Escalate this submission for additional verification and specialist review."
        : null,
      ...(Array.isArray(ai.recommended_human_actions) ? ai.recommended_human_actions : []),
      "Verify all payment, identity, sender, and contact details through trusted channels before acting.",
      "Do not rely solely on contact information, phone numbers, links, or attachments supplied inside the suspicious communication.",
      "Preserve the full communication chain, attachments, and related records for follow-up review.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        final_risk_level: riskLevel,
        final_decision: finalDecision,
        report_summary: summary,
        expert_notes: expertNotes || summary,
        recommendations,
        report_status: "draft",
        status: "in_review",
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { detail: `Draft generation failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.redirect(
      new URL(`/admin/submissions/${id}?draft=generated`, request.url),
      303
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json({ detail: message }, { status: 500 });
  }
}