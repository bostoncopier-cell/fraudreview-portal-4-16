import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

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

    if (typeof id !== "string" || !id) {
      return NextResponse.json({ detail: "Invalid request." }, { status: 400 });
    }

    const updates: Record<string, string> = {};

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

      updates.final_decision = finalDecision;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { detail: "No update values provided." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("submissions")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { detail: `Update failed: ${error.message}` },
        { status: 500 }
      );
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