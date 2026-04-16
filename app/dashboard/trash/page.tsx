export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

type Submission = {
  id: number;
  user_id: string;
  reference_id: string;
  contact_email: string | null;
  transaction_type: string | null;
  file_name: string | null;
  status: string | null;
  created_at: string | null;
  deleted_at: string | null;
};

export default async function DashboardTrashPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  const submissions = (data || []) as Submission[];

  if (error) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] p-8">
        <p className="text-red-600">Failed to load trash: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-[#0b1f3a]">
            Your Trash
          </h1>

          <a
            href="/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Back to Dashboard
          </a>
        </div>

        {submissions.length === 0 ? (
          <p className="text-slate-600">Trash is empty.</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[#0b1f3a]">
                      {item.file_name || "Unnamed file"}
                    </p>

                    <p className="text-sm text-slate-600">
                      Reference ID: {item.reference_id}
                    </p>

                    <p className="text-sm text-slate-600">
                      Deleted:{" "}
                      {item.deleted_at
                        ? new Date(item.deleted_at).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>

                  <form
                    action={`/api/dashboard-submissions/${item.id}/restore`}
                    method="POST"
                  >
                    <button
                      type="submit"
                      className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Restore
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}