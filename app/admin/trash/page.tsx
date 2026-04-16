export const dynamic = "force-dynamic";

import { auth, currentUser } from "@clerk/nextjs/server";
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
  final_decision: string | null;
  created_at: string | null;
  deleted_at: string | null;
};

async function getCurrentUserEmail() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user.emailAddresses?.[0]?.emailAddress || "";
}

export default async function AdminTrashPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const email = await getCurrentUserEmail();
  const adminEmail = process.env.ADMIN_EMAIL || "";

  if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  const submissions = (data || []) as Submission[];

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Admin Trash</h1>
          <p className="mt-3 text-red-600">
            Failed to load deleted submissions: {error.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Fraud Review Portal
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Admin Trash
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Restore deleted submissions or review what was removed from active view.
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Back to Admin
          </a>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Deleted submissions
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              These submissions are hidden from active view but still stored.
            </p>
          </div>

          <div className="p-6">
            {submissions.length === 0 ? (
              <p className="text-sm text-slate-600">Trash is empty.</p>
            ) : (
              <div className="space-y-4">
                {submissions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-slate-900">
                          {item.file_name || "Unnamed file"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Reference ID: {item.reference_id}
                        </p>
                        <p className="text-sm text-slate-600">
                          Contact email: {item.contact_email || "N/A"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Transaction type: {item.transaction_type || "N/A"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Deleted:{" "}
                          {item.deleted_at
                            ? new Date(item.deleted_at).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/admin/submissions/${item.id}`}
                          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
                        >
                          Open Detail
                        </a>

                        <form
                          action={`/api/submissions/${item.id}/restore`}
                          method="POST"
                        >
                          <button
                            type="submit"
                            className="inline-flex items-center rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Restore
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}