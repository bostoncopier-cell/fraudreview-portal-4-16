import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("id,user_id")
    .eq("id", id)
    .single();

  if (error || !data) {
    return new NextResponse("Submission not found", { status: 404 });
  }

  if (data.user_id !== userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const res = await fetch(
    `https://fraud-review-api.onrender.com/api/submissions/${id}/delete`,
    {
      method: "POST",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trash");
  revalidatePath("/admin");
  revalidatePath("/admin/trash");

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
