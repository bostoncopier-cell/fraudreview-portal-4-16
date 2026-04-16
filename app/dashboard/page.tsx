export const dynamic = "force-dynamic";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import LogoBadge from "@/app/components/logo-badge";

type Submission = {
  id: number;
  user_id: string;
  reference_id: string;
  contact_email: string | null;
  transaction_type: string | null;
  file_name: string | null;
  status: string | null;
  created_at: string | null;
};

function formatStatus(status: string | null) {
  const value = (status || "pending").toLowerCase();

  if (value === "pending") {
    return "bg-amber-50 text-amber-800 border border-amber-200";
  }

  if (value === "reviewed") {
    return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  }

  if (value === "flagged" || value === "escalated") {
    return "bg-red-50 text-red-800 border border-red-200";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200";
}

export default async function DashboardPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const email =
    (sessionClaims?.email as string | undefined) ||
    (sessionClaims?.primaryEmailAddress as string | undefined) ||
    "Signed-in user";

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const submissions = (data || []) as Submission[];

  if (error) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] p-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-[#0b1f3a]">Dashboard</h1>
          <p className="mt-3 text-red-600">
            Failed to load submissions: {error.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6]">
      <div className="mt-6 px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto mb-6 max-w-6xl overflow-hidden rounded-3xl border border-[#d6c39a] bg-gradient-to-r from-[#0b1f3a] to-[#1a355a] shadow-sm">
          <div className="grid gap-6 px-6 py-8 md:grid-cols-[1.15fr_0.85fr] md:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#e7c76a]">
                Your activity
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Submission dashboard
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-200 md:text-base">
                Review your uploaded files, current status, and submission
                history in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e7c76a]">
    Signed in as
  </p>
  <p className="mt-2 truncate text-sm font-medium text-white">
    {email}
  </p>

  <div className="mt-4 flex flex-col gap-2">
    <div className="inline-flex rounded-full bg-[#4caf50]/15 px-3 py-1 text-xs font-medium text-[#bfe6c3]">
      Protected workspace
    </div>

    <a
      href="/dashboard/trash"
      className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
    >
      View Trash
    </a>
  </div>
</div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-[#e7e1d3] bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Total submissions
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#0b1f3a]">
                {submissions.length}
              </p>
            </div>

            <div className="rounded-3xl border border-[#e7e1d3] bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Latest status
              </p>
              <p className="mt-3 text-3xl font-semibold capitalize text-[#0b1f3a]">
                {submissions[0]?.status || "No data"}
              </p>
            </div>

            <div className="rounded-3xl border border-[#e7e1d3] bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Most recent reference
              </p>
              <p className="mt-3 truncate text-lg font-semibold text-[#0b1f3a]">
                {submissions[0]?.reference_id || "No data"}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#e7e1d3] bg-white shadow-sm">
            <div className="border-b border-[#f0eadf] p-6">
              <div className="flex items-center gap-3">
                <LogoBadge size={48} />
                <div>
                  <h2 className="text-2xl font-semibold text-[#0b1f3a]">
                    Your submissions
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Only files uploaded under your signed-in account appear
                    here.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {submissions.length > 0 ? (
                <div className="grid gap-4">
                  {submissions.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-[#fffdf9] p-5 transition hover:border-[#d6c39a]"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <p className="text-lg font-semibold text-[#0b1f3a]">
                            {item.file_name || "Unnamed file"}
                          </p>
                          <p className="text-sm text-slate-600">
                            Reference ID: {item.reference_id}
                          </p>
                          <p className="text-sm text-slate-600">
                            Transaction type: {item.transaction_type || "N/A"}
                          </p>
                          <p className="text-sm text-slate-600">
                            Contact email: {item.contact_email || "N/A"}
                          </p>
                        </div>

                        <div className="space-y-2 md:text-right">
                          <div
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${formatStatus(
                              item.status
                            )}`}
                          >
                            {item.status || "pending"}
                          </div>

                          <p className="text-sm text-slate-500">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString()
                              : ""}
                          </p>

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <a
                              href={`/dashboard/${item.id}`}
                              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
                            >
                              Open Detail
                            </a>

                            <form
                              action={`/api/dashboard-submissions/${item.id}/delete`}
                              method="POST"
                            >
                              <button
                                type="submit"
                                className="inline-flex items-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-[#fffdf9] p-6">
                  <p className="text-slate-600">No submissions yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}