"use client";

import { useMemo, useRef, useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  CheckCircle2,
  FileUp,
  Loader2,
  Mail,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";

const MAX_FILE_SIZE_MB = 20;
const ACCEPTED_FILE_TYPES = ".eml,.msg,.pdf,.png,.jpg,.jpeg,.webp";

type SubmissionState = "idle" | "submitting" | "success" | "error";
type TransactionType = "invoice" | "wire" | "vendor-change" | "other";

const transactionOptions: {
  value: TransactionType;
  label: string;
  description: string;
}[] = [
  {
    value: "invoice",
    label: "Invoice / payment request",
    description: "A bill, invoice, or request to pay.",
  },
  {
    value: "wire",
    label: "Wire / ACH instructions",
    description: "Banking details or transfer instructions changed or received.",
  },
  {
    value: "vendor-change",
    label: "Vendor change request",
    description:
      "A supplier/customer says their payment or contact details changed.",
  },
  {
    value: "other",
    label: "Other suspicious communication",
    description: "Anything else you want reviewed before acting.",
  },
];

export default function SubmitPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [transactionType, setTransactionType] =
    useState<TransactionType>("invoice");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const { user } = useUser();

  const isValidEmail = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);

  const isFileTooLarge = useMemo(() => {
    if (!file) return false;
    return file.size > MAX_FILE_SIZE_MB * 1024 * 1024;
  }, [file]);

  const isFormValid = !!file && !!email && isValidEmail && !isFileTooLarge;

  const resetForm = () => {
    setTransactionType("invoice");
    setEmail("");
    setNotes("");
    setFile(null);
    setState("idle");
    setMessage("");
    setSubmissionId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setState("idle");
    setMessage("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFormValid || !file) {
      setState("error");
      setMessage(
        "Please add a valid email and a supported file before submitting."
      );
      return;
    }

    try {
      setState("submitting");
      setMessage("");
      setSubmissionId(null);

      const formData = new FormData();
      formData.append("transaction_type", transactionType);
      formData.append("contact_email", email);
      formData.append("notes", notes);
      formData.append("file", file);

      const response = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = { detail: rawText || "Unexpected response from server." };
      }

      if (!response.ok) {
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : data?.detail
            ? JSON.stringify(data.detail)
            : rawText || "Upload failed. Please try again.";

        throw new Error(detail);
      }

      setState("success");
      setSubmissionId(data?.submission_id || null);
      setMessage(
        data?.message ||
          "Your file was submitted successfully and flagged for specialist review before any guidance is provided."
      );
    } catch (error) {
      const friendlyError =
        error instanceof Error
          ? error.message
          : typeof error === "object"
          ? JSON.stringify(error)
          : "Something went wrong while submitting your file. Please try again.";

      setState("error");
      setMessage(friendlyError);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Fraud Review Portal
                </p>
                <h1 className="text-lg font-semibold text-slate-900">
                  Secure Submission Workspace
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Signed in as
              </p>
              <p className="max-w-[220px] truncate text-sm font-medium text-slate-700">
                {user?.primaryEmailAddress?.emailAddress || "Loading..."}
              </p>
            </div>

            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              Dashboard
            </a>

            <div className="rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-10 md:px-6">
        <div className="mx-auto mb-6 max-w-6xl rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-sm">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-300">
              Human-in-the-loop review
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Submit suspicious payment communications before you act.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300 md:text-base">
              Upload suspicious emails, PDFs, screenshots, or messages for
              specialist review. This workflow is designed to reduce false
              confidence and support informed decisions before money moves.
            </p>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="space-y-4 border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-3xl font-semibold tracking-tight text-slate-900">
                    Before You Send Money — Get It Reviewed
                  </h3>
                  <p className="mt-1 text-base text-slate-600">
                    Upload a suspicious payment-related email, screenshot, PDF,
                    or message for review.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      1. What kind of transaction is this?
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Choose the closest match so the review team has better
                      context.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {transactionOptions.map((option) => {
                      const selected = transactionType === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`cursor-pointer rounded-2xl border p-4 transition ${
                            selected
                              ? "border-slate-900 bg-white shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="transactionType"
                              value={option.value}
                              checked={selected}
                              onChange={() =>
                                setTransactionType(option.value)
                              }
                              className="mt-1"
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900">
                                {option.label}
                              </div>
                              <div className="text-sm text-slate-600">
                                {option.description}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      2. Upload the file
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Supported: EML, MSG, PDF, PNG, JPG, JPEG, WEBP. Max file
                      size: {MAX_FILE_SIZE_MB} MB.
                    </p>
                  </div>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center transition hover:border-slate-400">
                    <UploadCloud className="mb-3 h-10 w-10 text-slate-500" />
                    <span className="text-base font-medium text-slate-900">
                      {file ? file.name : "Click to choose a file"}
                    </span>
                    <span className="mt-1 text-sm text-slate-600">
                      {file
                        ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                        : "Or drag and drop from your device"}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {isFileTooLarge && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <div className="font-semibold text-red-800">
                        File too large
                      </div>
                      <div className="text-sm text-red-700">
                        Please choose a file smaller than {MAX_FILE_SIZE_MB} MB.
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      3. Where should we send the review status?
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      This is used for submission confirmation and specialist
                      follow-up.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="contactEmail"
                        className="block text-sm font-medium text-slate-900"
                      >
                        Contact email
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="contactEmail"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400"
                        />
                      </div>
                      {!!email && !isValidEmail && (
                        <p className="text-sm text-red-600">
                          Please enter a valid email address.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="notes"
                        className="block text-sm font-medium text-slate-900"
                      >
                        Optional notes
                      </label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Anything you want the reviewer to know?"
                        className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={!isFormValid || state === "submitting"}
                    className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {state === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FileUp className="h-4 w-4" />
                        Submit for Review
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-slate-900"
                  >
                    Reset form
                  </button>

                  <a
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 hover:bg-slate-100"
                  >
                    View Dashboard
                  </a>
                </div>

                {state === "success" && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-2 font-semibold text-green-800">
                      <CheckCircle2 className="h-4 w-4" />
                      Submission received
                    </div>
                    <div className="mt-1 text-sm text-green-700">
                      {message}
                      {submissionId ? (
                        <span className="mt-2 block font-medium">
                          Reference ID: {submissionId}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}

                {state === "error" && message && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="font-semibold text-red-800">
                      Submission error
                    </div>
                    <div className="text-sm text-red-700">{message}</div>
                  </div>
                )}
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                What happens next
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
                <p>
                  Your upload is analyzed for risk indicators such as
                  payment-instruction changes, sender/domain mismatches, urgency
                  language, and suspicious request patterns.
                </p>
                <p>
                  Results should remain gated behind specialist review before
                  final guidance is sent to the end user.
                </p>
                <p>
                  This keeps the system conservative, helps reduce false
                  confidence, and supports a human-in-the-loop review process.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Deployment checklist
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  • Confirm FastAPI CORS includes your production and www
                  domains.
                </div>
                <div>
                  • Verify <code>POST /api/submit</code> accepts{" "}
                  <code>transaction_type</code>, <code>contact_email</code>,{" "}
                  <code>notes</code>, and <code>file</code>.
                </div>
                <div>
                  • Keep health check live at <code>/health</code>.
                </div>
                <div>
                  • Confirm analyst notifications still go to the correct review
                  inbox.
                </div>
                <div>
                  • Review submissions in your dashboard after upload to confirm
                  user-linked storage is working.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}