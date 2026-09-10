"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  REVIEW_REPORT_REASONS,
  type ReviewReportReason,
} from "@/lib/review-moderation";

type ReviewReportDialogProps = {
  reviewId: string;
  reviewerName: string;
  onClose: () => void;
  onReported: (reviewId: string) => void;
};

export default function ReviewReportDialog({
  reviewId,
  reviewerName,
  onClose,
  onReported,
}: ReviewReportDialogProps) {
  const [reason, setReason] = useState<ReviewReportReason | "">("");
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, submitting]);

  const submitReport = async () => {
    setErrorMessage("");

    if (!reason) {
      setErrorMessage("Choose the reason that best describes the concern.");
      return;
    }

    if (reason === "other" && !explanation.trim()) {
      setErrorMessage("Add a short explanation when selecting Other.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.rpc("report_published_review", {
      p_review_id: reviewId,
      p_reason: reason,
      p_explanation: explanation.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        setErrorMessage("You have already reported this review.");
      } else if (error.code === "42501") {
        setErrorMessage(
          "Only the professional reviewed can report this published review."
        );
      } else {
        setErrorMessage(error.message || "We couldn't submit this report.");
      }
      return;
    }

    onReported(reviewId);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/25 p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-review-title"
        className="w-full max-w-[560px] rounded-t-[26px] border border-lumina-border bg-lumina-surface p-6 shadow-[0_18px_60px_rgba(39,36,40,0.12)] sm:rounded-[26px] sm:p-8"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-lumina-text-muted">
              Review integrity
            </p>
            <h2
              id="report-review-title"
              className="mt-2 text-[27px] leading-tight text-lumina-text"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Report review
            </h2>
            <p className="mt-2 text-[13px] text-lumina-text-muted">
              Review from {reviewerName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close report review dialog"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-[20px] text-lumina-text-muted transition hover:border-lumina-text-muted hover:text-lumina-black disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <p className="mt-5 rounded-[16px] border border-lumina-glass-border bg-lumina-blush px-4 py-3 text-[12px] leading-[1.6] text-lumina-text-muted">
          A low rating, criticism, or disagreement alone is not a violation.
          Reporting records a concern for Lumina review and does not
          automatically hide a published review.
        </p>

        <label className="mt-5 block">
          <span className="mb-2 block text-[12px] font-medium text-lumina-text">
            Reason
          </span>
          <select
            value={reason}
            onChange={(event) => {
              setReason(event.target.value as ReviewReportReason | "");
              setErrorMessage("");
            }}
            className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition focus:border-lumina-text-muted"
          >
            <option value="">Select a reason</option>
            {REVIEW_REPORT_REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-[12px] font-medium text-lumina-text">
            Short explanation {reason !== "other" && "(optional)"}
          </span>
          <textarea
            value={explanation}
            onChange={(event) => {
              setExplanation(event.target.value);
              setErrorMessage("");
            }}
            maxLength={1000}
            rows={4}
            placeholder="Share the specific policy concern for Lumina moderation."
            className="w-full resize-none rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] leading-[1.6] text-lumina-text outline-none transition focus:border-lumina-text-muted"
          />
          <span className="mt-1 block text-right text-[11px] text-lumina-text-muted">
            {explanation.length}/1000
          </span>
        </label>

        {errorMessage && (
          <p role="alert" className="mt-3 text-[12px] text-lumina-attention">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] text-lumina-text transition hover:border-lumina-text-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitReport}
            disabled={submitting}
            className="rounded-full bg-lumina-black px-5 py-2.5 text-[13px] text-white transition hover:opacity-85 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}
