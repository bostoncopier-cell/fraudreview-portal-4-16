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

async function getCurrentUserEmail() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const email =
    (sessionClaims?.email as string | undefined) ||
    (sessionClaims?.primaryEmailAddress as string | undefined) ||
    "";

  return email;
}

export default async function AdminPage() {
  const email = await getCurrentUserEmail();
  const adminEmail = process.env.ADMIN_EMAIL || "";

  if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  const submissions = (data || []) as Submission[];

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Admin Panel</h1>
          <p className="mt-3 text-red-600">
            Failed to load submissions: {error.message}
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
              Admin Review Panel
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Review and update all submissions.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900">
              All submissions
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Admin-only view of every uploaded submission.
            </p>
          </div>

          <div className="p-6">
            {submissions.length === 0 ? (
              <p className="text-sm text-slate-600">No submissions yet.</p>
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
                          User ID: {item.user_id}
                        </p>
                        <p className="text-sm text-slate-600">
                          Submitted:{" "}
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>

                      <div className="min-w-[220px] space-y-3">
                        <div
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${formatStatus(
                            item.status
                          )}`}
                        >
                          {item.status || "pending"}
                        </div>

                        <form
                          action={`/api/admin/submissions/${item.id}`}
                          method="POST"
                          className="space-y-2"
                        >
                          <input type="hidden" name="_method" value="PATCH" />

                          <select
                            name="status"
                            defaultValue={item.status || "pending"}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                          >
                            <option value="pending">pending</option>
                            <option value="reviewed">reviewed</option>
                            <option value="flagged">flagged</option>
                            <option value="escalated">escalated</option>
                          </select>

                          <button
                            type="submit"
                            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                          >
                            Update Status
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