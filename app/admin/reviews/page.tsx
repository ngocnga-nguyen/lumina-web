"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatRequestServiceSummary } from "@/lib/request-services";
import {
  getReviewReportReasonLabel,
  type ReviewModerationStatus,
} from "@/lib/review-moderation";

type ModerationReport = {
  id: string;
  reporter_id: string;
  reason: string;
  explanation: string | null;
  created_at: string;
  resolution: "kept" | "removed" | null;
  resolved_at: string | null;
  resolved_by: string | null;
};

type ModerationRequest = {
  id: string;
  service_requested: string | null;
  requested_services: unknown;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_price: number | null;
  scheduled_for: string | null;
  expected_end_at: string | null;
  booking_status: string | null;
  completion_protocol_version: number | null;
  appointment_exception_reason: string | null;
  appointment_exception_note: string | null;
  client_exception_note: string | null;
};

type ModerationReview = {
  id: string;
  artist_id: string;
  artist_name: string | null;
  client_id: string;
  reviewer_name: string;
  request_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  artist_response: string | null;
  artist_response_at: string | null;
  moderation_status: ReviewModerationStatus;
  moderated_at: string | null;
  moderated_by: string | null;
  request: ModerationRequest | null;
  reports: ModerationReport[];
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "Not recorded";
}

function statusClasses(status: ReviewModerationStatus) {
  if (status === "published") return "border-lumina-success/25 bg-lumina-success-soft text-lumina-success";
  if (status === "removed") return "border-lumina-text-muted/35 bg-lumina-pearl text-lumina-text";
  return "border-lumina-attention/35 bg-lumina-attention-soft text-lumina-attention";
}

export default function ReviewModerationPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [filter, setFilter] = useState<"action" | "all">("action");
  const [workingReviewId, setWorkingReviewId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadQueue = async () => {
    const { data, error } = await supabase.rpc("get_review_moderation_queue");

    if (error) {
      setErrorMessage(error.message || "The moderation queue could not be loaded.");
      return;
    }

    setReviews(Array.isArray(data) ? (data as ModerationReview[]) : []);
  };

  useEffect(() => {
    const authorizeAndLoad = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: isAdmin, error } = await supabase.rpc("is_lumina_admin");

      if (error || !isAdmin) {
        router.replace("/");
        return;
      }

      setAuthorized(true);
      await loadQueue();
      setLoading(false);
    };

    authorizeAndLoad();
  }, [router]);

  const moderate = async (
    review: ModerationReview,
    decision: "publish" | "remove"
  ) => {
    const actionLabel = decision === "publish" ? "publish/keep" : "remove";
    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel} this review? The review row and audit history will be preserved.`
      )
    ) {
      return;
    }

    setWorkingReviewId(review.id);
    setErrorMessage("");
    const { error } = await supabase.rpc("moderate_review", {
      p_review_id: review.id,
      p_decision: decision,
    });

    if (error) {
      setErrorMessage(error.message || "The moderation decision could not be saved.");
      setWorkingReviewId(null);
      return;
    }

    await loadQueue();
    setWorkingReviewId(null);
  };

  const visibleReviews = reviews.filter((review) => {
    if (filter === "all") return true;
    return (
      review.moderation_status === "pending" ||
      review.reports.some((report) => report.resolution === null)
    );
  });

  if (loading || !authorized) {
    return (
      <main className="min-h-screen bg-lumina-bg px-5 py-12 text-lumina-text">
        <p className="mx-auto max-w-[1180px] text-[14px] text-lumina-text-muted">
          Checking moderation access…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-lumina-bg text-lumina-text">
      <header className="border-b border-lumina-border bg-lumina-glass px-5 py-4 backdrop-blur-[10px] md:px-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-5">
          <Link href="/" className="text-[13px] text-lumina-text-muted transition hover:text-lumina-text">
            ← Lumina
          </Link>
          <nav className="flex items-center gap-4 text-[12px] text-lumina-text-muted" aria-label="Admin moderation">
            <Link href="/admin/reviews" className="font-medium text-lumina-text">
              Reviews
            </Link>
            <Link href="/admin/verifications" className="transition hover:text-lumina-text">
              <span className="hidden sm:inline">License verification</span>
              <span className="sm:hidden">Licenses</span>
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => loadQueue()}
            className="text-[13px] text-lumina-text-muted transition hover:text-lumina-text"
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-[1280px] px-5 py-10 md:px-8 md:py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-lumina-text-muted">
              Review integrity
            </p>
            <h1
              className="mt-3 text-[38px] leading-[1.05] md:text-[50px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Moderation queue
            </h1>
            <p className="mt-3 max-w-[680px] text-[14px] leading-[1.7] text-lumina-text-muted">
              Review reports and Booking Lite exception reviews. Critical private
              client records are not included in this view.
            </p>
          </div>

          <div className="flex w-fit rounded-full border border-lumina-border bg-lumina-surface p-1">
            <button
              type="button"
              onClick={() => setFilter("action")}
              className={`rounded-full px-4 py-2 text-[12px] transition ${
                filter === "action" ? "bg-lumina-black text-white" : "text-lumina-text-muted"
              }`}
            >
              Action needed
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-4 py-2 text-[12px] transition ${
                filter === "all" ? "bg-lumina-black text-white" : "text-lumina-text-muted"
              }`}
            >
              All reviews
            </button>
          </div>
        </div>

        {errorMessage && (
          <p role="alert" className="mt-6 rounded-[16px] border border-lumina-attention/30 bg-lumina-attention-soft px-4 py-3 text-[13px] text-lumina-attention">
            {errorMessage}
          </p>
        )}

        <p className="mt-8 text-[12px] text-lumina-text-muted">
          {visibleReviews.length} {visibleReviews.length === 1 ? "review" : "reviews"}
        </p>

        {visibleReviews.length === 0 ? (
          <div className="mt-4 rounded-[22px] border border-lumina-border bg-lumina-surface p-7">
            <p className="text-[15px] text-lumina-text">No moderation items here.</p>
            <p className="mt-2 text-[13px] text-lumina-text-muted">
              New professional reports and pending Booking Lite reviews will appear automatically.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {visibleReviews.map((review) => {
              const openReports = review.reports.filter(
                (report) => report.resolution === null
              );
              const request = review.request;
              const serviceSummary = request
                ? formatRequestServiceSummary(request) || "Not recorded"
                : "Not recorded";

              return (
                <article
                  key={review.id}
                  className="rounded-[24px] border border-lumina-border bg-lumina-surface p-5 md:p-7"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-medium capitalize ${statusClasses(review.moderation_status)}`}>
                          {review.moderation_status}
                        </span>
                        {openReports.length > 0 && (
                          <span className="rounded-full border border-lumina-attention/35 bg-lumina-attention-soft px-3 py-1 text-[11px] text-lumina-attention">
                            {openReports.length} open report{openReports.length === 1 ? "" : "s"}
                          </span>
                        )}
                        {request?.appointment_exception_reason && (
                          <span className="rounded-full border border-lumina-attention/30 bg-lumina-attention-soft px-3 py-1 text-[11px] text-lumina-attention">
                            Booking exception
                          </span>
                        )}
                      </div>

                      <div className="mt-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                        <h2 className="text-[18px] font-medium">
                          {review.reviewer_name}
                        </h2>
                        <p className="text-[13px] text-lumina-text-muted">
                          review of {review.artist_name || "professional"}
                        </p>
                      </div>

                      <p className="mt-2 text-lumina-attention" aria-label={`${review.rating} out of 5 stars`}>
                        {"★".repeat(review.rating)}
                        <span className="text-lumina-border">{"★".repeat(5 - review.rating)}</span>
                      </p>
                      <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.7] text-lumina-text">
                        {review.comment || "No written comment."}
                      </p>
                      <p className="mt-3 text-[11px] text-lumina-text-muted">
                        Submitted {formatDateTime(review.created_at)} · Review {review.id}
                      </p>

                      {review.artist_response && (
                        <div className="mt-5 rounded-[16px] border border-lumina-border bg-lumina-surface-soft p-4">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-lumina-text-muted">
                            Professional response
                          </p>
                          <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.6] text-lumina-text">
                            {review.artist_response}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => moderate(review, "publish")}
                        disabled={workingReviewId === review.id}
                        className="rounded-full border border-lumina-text-muted/35 bg-lumina-surface px-5 py-2.5 text-[12px] text-lumina-text transition hover:border-lumina-text-muted disabled:opacity-50"
                      >
                        Keep / Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => moderate(review, "remove")}
                        disabled={workingReviewId === review.id}
                        className="rounded-full bg-lumina-black px-5 py-2.5 text-[12px] text-white transition hover:bg-lumina-text disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 border-t border-lumina-border pt-6 lg:grid-cols-2">
                    <div className="rounded-[18px] bg-lumina-surface-soft p-4">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-lumina-text-muted">
                        Linked appointment
                      </p>
                      <dl className="mt-3 grid grid-cols-1 gap-3 text-[12px] sm:grid-cols-2">
                        <div>
                          <dt className="text-lumina-text-muted">Service</dt>
                          <dd className="mt-1 text-lumina-text">{serviceSummary}</dd>
                        </div>
                        <div>
                          <dt className="text-lumina-text-muted">Final price</dt>
                          <dd className="mt-1 text-lumina-text">{formatMoney(request?.proposed_price)}</dd>
                        </div>
                        <div>
                          <dt className="text-lumina-text-muted">Scheduled</dt>
                          <dd className="mt-1 text-lumina-text">{formatDateTime(request?.scheduled_for)}</dd>
                        </div>
                        <div>
                          <dt className="text-lumina-text-muted">Expected end</dt>
                          <dd className="mt-1 text-lumina-text">{formatDateTime(request?.expected_end_at)}</dd>
                        </div>
                        <div>
                          <dt className="text-lumina-text-muted">Booking status</dt>
                          <dd className="mt-1 capitalize text-lumina-text">{request?.booking_status || "Not recorded"}</dd>
                        </div>
                        <div>
                          <dt className="text-lumina-text-muted">Protocol</dt>
                          <dd className="mt-1 text-lumina-text">V{request?.completion_protocol_version || "—"}</dd>
                        </div>
                      </dl>

                      {request?.appointment_exception_reason && (
                        <div className="mt-4 border-t border-lumina-border pt-4">
                          <p className="text-[12px] font-medium capitalize text-lumina-attention">
                            {request.appointment_exception_reason.replaceAll("_", " ")}
                          </p>
                          {request.appointment_exception_note && (
                            <p className="mt-2 text-[12px] leading-[1.6] text-lumina-text-muted">
                              Professional: {request.appointment_exception_note}
                            </p>
                          )}
                          {request.client_exception_note && (
                            <p className="mt-2 text-[12px] leading-[1.6] text-lumina-text-muted">
                              Client: {request.client_exception_note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[18px] bg-lumina-surface-soft p-4">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-lumina-text-muted">
                        Reports
                      </p>
                      {review.reports.length === 0 ? (
                        <p className="mt-3 text-[12px] leading-[1.6] text-lumina-text-muted">
                          No professional report. Admins may still moderate this review.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {review.reports.map((report) => (
                            <div key={report.id} className="border-b border-lumina-border pb-3 last:border-0 last:pb-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[12px] font-medium text-lumina-text">
                                  {getReviewReportReasonLabel(report.reason)}
                                </p>
                                <span className="text-[10px] capitalize text-lumina-text-muted">
                                  {report.resolution || "Open"}
                                </span>
                              </div>
                              {report.explanation && (
                                <p className="mt-2 whitespace-pre-line text-[12px] leading-[1.6] text-lumina-text-muted">
                                  {report.explanation}
                                </p>
                              )}
                              <p className="mt-2 text-[10px] text-lumina-text-muted">
                                {formatDateTime(report.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
