import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || "";
    const adminEmail = process.env.ADMIN_EMAIL || "";

    if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const formData = await request.formData();
    const method = formData.get("_method");
    const status = formData.get("status");

    if (method !== "PATCH" || typeof status !== "string") {
      return NextResponse.json({ detail: "Invalid request." }, { status: 400 });
    }

    const allowedStatuses = ["pending", "reviewed", "flagged", "escalated"];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ detail: "Invalid status." }, { status: 400 });
    }

    const { id } = await context.params;

if (!id) {
  return NextResponse.json(
    { detail: "Invalid submission id." },
    { status: 400 }
  );
}

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("submissions")
      .update({ status })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { detail: `Update failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/admin", request.url), 303);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json({ detail: message }, { status: 500 });
  }
}