export const dynamic = "force-dynamic";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";

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
};

type AdminPageProps = {
  searchParams: Promise<{
    status?: string;
    decision?: string;
    q?: string;
  }>;
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

function formatDecision(decision: string | null) {
  const value = (decision || "").toLowerCase();

  if (value === "clear") {
    return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  }

  if (value === "caution") {
    return "bg-amber-50 text-amber-800 border border-amber-200";
  }

  if (value === "suspicious" || value === "escalate") {
    return "bg-red-50 text-red-800 border border-red-200";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200";
}

async function getCurrentUserEmail() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user.emailAddresses?.[0]?.emailAddress || "";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const status = params.status?.trim() || "";
  const decision = params.decision?.trim() || "";
  const q = params.q?.trim() || "";
  const safeQ = q.replace(/,/g, "").trim();

  const email = await getCurrentUserEmail();
  const adminEmail = process.env.ADMIN_EMAIL || "";

  if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Admin Debug</h1>

          <p className="mt-4 text-sm text-slate-600">
            Signed-in email from Clerk:
          </p>
          <p className="mt-1 rounded bg-slate-100 p-3 text-sm text-slate-900">
            {email || "NONE"}
          </p>

          <p className="mt-4 text-sm text-slate-600">
            ADMIN_EMAIL from .env.local:
          </p>
          <p className="mt-1 rounded bg-slate-100 p-3 text-sm text-slate-900">
            {adminEmail || "NONE"}
          </p>

          <p className="mt-4 text-sm text-red-600">
            These values do not match, so admin access is being denied.
          </p>
        </div>
      </main>
    );
  }

 const supabase = createAdminClient();

  let query = supabase
  .from("submissions")
  .select("*")
  .is("deleted_at", null)
  .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (decision) {
    query = query.eq("final_decision", decision);
  }

  if (safeQ) {
    query = query.or(
      `reference_id.ilike.%${safeQ}%,contact_email.ilike.%${safeQ}%,file_name.ilike.%${safeQ}%`
    );
  }

  const { data, error } = await query;

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

          <div className="flex items-center gap-2">
  <a
    href="/admin/trash"
    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
  >
    View Trash
  </a>

  <a
    href="/dashboard"
    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
  >
    Back to Dashboard
  </a>
</div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <p className="mt-1 text-sm text-slate-600">
            Narrow the admin view by status, final decision, or search term.
          </p>

          <form method="GET" className="mt-5 grid gap-4 md:grid-cols-4">
            <div>
              <label
                htmlFor="status"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">All statuses</option>
                <option value="pending">pending</option>
                <option value="reviewed">reviewed</option>
                <option value="flagged">flagged</option>
                <option value="escalated">escalated</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="decision"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Final decision
              </label>
              <select
                id="decision"
                name="decision"
                defaultValue={decision}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">All decisions</option>
                <option value="clear">clear</option>
                <option value="caution">caution</option>
                <option value="suspicious">suspicious</option>
                <option value="escalate">escalate</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="q"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Search
              </label>
              <input
                id="q"
                name="q"
                type="text"
                defaultValue={q}
                placeholder="Reference ID, email, file name"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Apply
              </button>

              <a
                href="/admin"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Reset
              </a>
            </div>
          </form>

          <div className="mt-4 text-sm text-slate-600">
            Showing results
            {status ? ` | Status: ${status}` : ""}
            {decision ? ` | Decision: ${decision}` : ""}
            {q ? ` | Search: "${q}"` : ""}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/admin"
              className={`rounded-full px-3 py-1 text-sm transition ${
                !status
                  ? "border border-slate-900 bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              All
            </a>

            <a
              href="/admin?status=pending"
              className={`rounded-full px-3 py-1 text-sm transition ${
                status === "pending"
                  ? "border border-amber-800 bg-amber-600 text-white"
                  : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Pending
            </a>

            <a
              href="/admin?status=reviewed"
              className={`rounded-full px-3 py-1 text-sm transition ${
                status === "reviewed"
                  ? "border border-emerald-800 bg-emerald-600 text-white"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              Reviewed
            </a>

            <a
              href="/admin?status=flagged"
              className={`rounded-full px-3 py-1 text-sm transition ${
                status === "flagged"
                  ? "border border-red-800 bg-red-600 text-white"
                  : "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              }`}
            >
              Flagged
            </a>

            <a
              href="/admin?status=escalated"
              className={`rounded-full px-3 py-1 text-sm transition ${
                status === "escalated"
                  ? "border border-red-800 bg-red-600 text-white"
                  : "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              }`}
            >
              Escalated
            </a>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={status ? `/admin?status=${status}` : "/admin"}
              className={`rounded-full px-3 py-1 text-sm transition ${
                !decision
                  ? "border border-slate-900 bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              All decisions
            </a>

            <a
              href={
                status
                  ? `/admin?status=${status}&decision=clear`
                  : "/admin?decision=clear"
              }
              className={`rounded-full px-3 py-1 text-sm transition ${
                decision === "clear"
                  ? "border border-emerald-800 bg-emerald-600 text-white"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              Clear
            </a>

            <a
              href={
                status
                  ? `/admin?status=${status}&decision=caution`
                  : "/admin?decision=caution"
              }
              className={`rounded-full px-3 py-1 text-sm transition ${
                decision === "caution"
                  ? "border border-amber-800 bg-amber-600 text-white"
                  : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Caution
            </a>

            <a
              href={
                status
                  ? `/admin?status=${status}&decision=suspicious`
                  : "/admin?decision=suspicious"
              }
              className={`rounded-full px-3 py-1 text-sm transition ${
                decision === "suspicious"
                  ? "border border-red-800 bg-red-600 text-white"
                  : "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              }`}
            >
              Suspicious
            </a>

            <a
              href={
                status
                  ? `/admin?status=${status}&decision=escalate`
                  : "/admin?decision=escalate"
              }
              className={`rounded-full px-3 py-1 text-sm transition ${
                decision === "escalate"
                  ? "border border-red-800 bg-red-600 text-white"
                  : "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              }`}
            >
              Escalate
            </a>
          </div>
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
              <p className="text-sm text-slate-600">No submissions found.</p>
            ) : (
              <div className="space-y-4">
                {submissions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300"
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

                        <div className="pt-2 flex flex-wrap gap-2">
  <a
    href={`/admin/submissions/${item.id}`}
    className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
  >
    Open Detail
  </a>
<a
  href={`/admin/submissions/${item.id}/report`}
  className="inline-flex items-center rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
>
  View Report
</a>
  <form
  action={`/api/submissions/${item.id}/delete`}
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

                      <div className="min-w-[220px] space-y-3">
                        <div
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${formatStatus(
                            item.status
                          )}`}
                        >
                          {item.status || "pending"}
                        </div>

                        <div
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${formatDecision(
                            item.final_decision
                          )}`}
                        >
                          {item.final_decision || "no decision"}
                        </div>

                        <form
                          action="/api/admin/submissions"
                          method="POST"
                          className="space-y-2"
                        >
                          <input type="hidden" name="id" value={String(item.id)} />

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