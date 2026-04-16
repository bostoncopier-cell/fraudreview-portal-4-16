"use client";

import { useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import LogoBadge from "@/app/components/logo-badge";
import {
  CheckCircle2,
  FileUp,
  Loader2,
  Mail,
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

function getTransactionLabel(type: TransactionType) {
  switch (type) {
    case "invoice":
      return "Invoice / payment request";
    case "wire":
      return "Wire / ACH instructions";
    case "vendor-change":
      return "Vendor change request";
    case "other":
      return "Other suspicious communication";
    default:
      return "Submission";
  }
}

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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setState("idle");
    setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      const res = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setMessage(data.detail || "Upload failed");
        return;
      }

      setState("success");
      setSubmissionId(data.submission_id || null);
      setMessage(
        data.message ||
          "Your file was submitted successfully and flagged for specialist review before any guidance is provided."
      );
    } catch {
      setState("error");
      setMessage("Something went wrong while submitting your file. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mt-6 px-4 py-10 md:px-6">
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-3">
                  <LogoBadge size={48} />
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
                  {transactionOptions.map((opt) => {
                    const selected = transactionType === opt.value;

                    return (
                      <label
                        key={opt.value}
                        className={`cursor-pointer rounded-2xl border p-4 transition ${
                          selected
                            ? "border-slate-900 bg-white shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={transactionType === opt.value}
                            onChange={() => setTransactionType(opt.value)}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">
                              {opt.label}
                            </div>
                            <div className="text-sm text-slate-600">
                              {opt.description}
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
                <div className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-green-700 shadow-sm">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold text-green-900">
                        Submission received
                      </div>

                      <p className="mt-2 text-sm leading-6 text-green-800">
                        {message}
                      </p>

                      <div className="mt-4 grid gap-4 rounded-2xl border border-green-200 bg-white p-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                            Reference ID
                          </p>
                          <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                            {submissionId || "Pending assignment"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                            Review status
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            Pending specialist review
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                            Contact email
                          </p>
                          <p className="mt-1 break-all text-sm font-medium text-slate-900">
                            {email}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                            Transaction type
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {getTransactionLabel(transactionType)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-green-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          What happens next
                        </p>
                        <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                          <p>
                            We’ve received your file and added it to the review
                            queue.
                          </p>
                          <p>
                            You’ll receive an email confirmation and another
                            update when the review status changes.
                          </p>
                          <p>
                            You can also track progress anytime from your
                            dashboard.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <a
                          href="/dashboard"
                          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                          Go to Dashboard
                        </a>

                        <button
                          type="button"
                          onClick={resetForm}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                        >
                          Submit Another File
                        </button>
                      </div>
                    </div>
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

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                How reviews are handled
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
                <p>
                  Every submission is reviewed through a conservative process
                  designed to help you pause, verify information, and avoid
                  acting too quickly on suspicious payment requests.
                </p>
                <p>
                  Files may be examined for signals such as changes to payment
                  instructions, sender or domain inconsistencies, urgency
                  language, or other patterns that deserve closer attention.
                </p>
                <p>
                  Review outcomes are not rushed to the user automatically. The
                  workflow is built to support careful, human-reviewed
                  communication before any final guidance is delivered.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                How this process helps protect you
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    Careful review process
                  </p>
                  <p className="mt-1">
                    Each submission is handled with a conservative,
                    human-in-the-loop review approach designed to reduce false
                    confidence before action is taken.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    Clear status updates
                  </p>
                  <p className="mt-1">
                    You’ll receive a confirmation after submission and another
                    update when your review status changes.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    Secure submission record
                  </p>
                  <p className="mt-1">
                    Your file, reference ID, and review status are tied to your
                    account so you can return to your dashboard and track
                    progress at any time.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    Built for caution
                  </p>
                  <p className="mt-1">
                    The goal is not to rush you into a decision. The goal is to
                    help you slow down, review the facts, and move forward more
                    safely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}