"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
    >
      Print Report
    </button>
  );
}