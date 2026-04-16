import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "";
  const adminEmail = process.env.ADMIN_EMAIL || "";

  if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;

  const res = await fetch(
    `https://fraud-review-api.onrender.com/api/submissions/${id}/restore`,
    {
      method: "POST",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/trash");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trash");

  return NextResponse.redirect(new URL("/admin/trash", request.url), 303);
}