import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

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

    const { error } = await supabase
      .from("submissions")
      .update({
        report_status: "finalized",
        status: "reviewed",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { detail: `Finalize failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.redirect(
      new URL(`/admin/submissions/${id}?report=finalized`, request.url),
      303
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json({ detail: message }, { status: 500 });
  }
}