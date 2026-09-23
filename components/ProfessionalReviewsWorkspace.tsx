"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, MessageSquareReply, Star } from "lucide-react";
import { useProfessionalWorkspace } from "@/components/ProfessionalWorkspaceContext";
import ReviewReportDialog from "@/components/ReviewReportDialog";
import ReviewStars from "@/components/ReviewStars";
import { setProfessionalReviewResponse } from "@/lib/review-actions";
import {
  formatReviewWorkspaceDate,
  getPublishedReviewSummary,
  getReviewServiceLabel,
  reviewNeedsProfessionalResponse,
  type ReviewWorkspaceRequest,
  type ReviewWorkspaceReview,
} from "@/lib/review-workspace";
import { supabase } from "@/lib/supabase";

type ReviewFilter = "all" | "needs_response";

const REVIEW_COLUMNS =
  "id, artist_id, client_id, request_id, reviewer_name, rating, comment, created_at, artist_response, artist_response_at, moderation_status";

export default function ProfessionalReviewsWorkspace() {
  const { professional } = useProfessionalWorkspace();
  const [reviews, setReviews] = useState<ReviewWorkspaceReview[]>([]);
  const [requests, setRequests] = useState<Map<string, ReviewWorkspaceRequest>>(new Map());
  const [reportedReviewIds, setReportedReviewIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [responseError, setResponseError] = useState("");
  const [reportingReview, setReportingReview] = useState<ReviewWorkspaceReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    const [reviewResult, reportResult] = await Promise.all([
      supabase
        .from("reviews")
        .select(REVIEW_COLUMNS)
        .eq("artist_id", professional.id)
        .eq("moderation_status", "published")
        .order("created_at", { ascending: false }),
      supabase
        .from("review_reports")
        .select("review_id")
        .eq("reporter_id", professional.id),
    ]);

    if (reviewResult.error) {
      setLoadError("Your reviews could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    const nextReviews = (reviewResult.data || []) as ReviewWorkspaceReview[];
    const requestIds = nextReviews
      .map((review) => review.request_id)
      .filter((requestId): requestId is string => Boolean(requestId));
    const requestResult = requestIds.length
      ? await supabase
          .from("client_requests")
          .select(
            "id, artist_id, client_id, service_requested, requested_services, status, client_status, booking_status, scheduled_for, expected_end_at, completed_at, completion_protocol_version, appointment_confirmed_at, appointment_exception_reason, artist_completion_response, client_completion_response, created_at"
          )
          .eq("artist_id", professional.id)
          .in("id", requestIds)
      : { data: [], error: null };

    setReviews(nextReviews);
    setRequests(
      new Map(
        ((requestResult.data || []) as ReviewWorkspaceRequest[]).map((request) => [
          request.id,
          request,
        ])
      )
    );
    setReportedReviewIds(
      new Set((reportResult.data || []).map((report) => report.review_id))
    );
    setLoading(false);
  }, [professional.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);

    const handleFocus = () => void load();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  const summary = useMemo(() => getPublishedReviewSummary(reviews), [reviews]);
  const visibleReviews = useMemo(
    () =>
      filter === "needs_response"
        ? reviews.filter(reviewNeedsProfessionalResponse)
        : reviews,
    [filter, reviews]
  );

  const openEditor = (review: ReviewWorkspaceReview) => {
    setEditingReviewId(review.id);
    setResponseDraft(review.artist_response || "");
    setResponseError("");
  };

  const saveResponse = async (review: ReviewWorkspaceReview) => {
    const response = responseDraft.trim();
    if (!response) {
      setResponseError("Write a response before saving.");
      return;
    }
    if (response.length > 2000) {
      setResponseError("Your response must be 2,000 characters or fewer.");
      return;
    }

    setSaving(true);
    setResponseError("");
    const { data, error } = await setProfessionalReviewResponse({
      reviewId: review.id,
      response,
    });
    setSaving(false);

    if (error || !data) {
      setResponseError(
        error?.code === "42501"
          ? "Only the reviewed professional can respond."
          : "Your response could not be saved. Please try again."
      );
      return;
    }

    setReviews((current) =>
      current.map((item) => (item.id === review.id ? data : item))
    );
    setEditingReviewId(null);
    setResponseDraft("");
  };

  const removeResponse = async (review: ReviewWorkspaceReview) => {
    if (!window.confirm("Remove your public response from this review?")) return;
    setSaving(true);
    const { data, error } = await setProfessionalReviewResponse({
      reviewId: review.id,
      response: null,
    });
    setSaving(false);

    if (error || !data) {
      setResponseError("Your response could not be removed.");
      return;
    }

    setReviews((current) =>
      current.map((item) => (item.id === review.id ? data : item))
    );
    setEditingReviewId(null);
    setResponseDraft("");
  };

  return (
    <section className="mx-auto w-full max-w-[1120px] px-3 py-5 md:px-8 md:py-8 lg:px-6 lg:py-8 xl:px-10 xl:py-10">
      <header className="lg:border-b lg:border-lumina-border/70 lg:pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted lg:text-[11px]">
          Reputation
        </p>
        <h1
          className="mt-1 text-[28px] font-semibold leading-none text-lumina-text lg:text-[32px] lg:leading-[1.1] xl:text-[36px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Reviews
        </h1>
        <p className="mt-2 text-[12px] leading-[1.5] text-lumina-text-muted lg:text-[13px]">
          See verified client feedback and respond thoughtfully.
        </p>
      </header>

      {loadError && (
        <div className="mt-5 flex items-center justify-between gap-3 border-y border-lumina-border py-3 text-[12px] text-lumina-text-muted">
          <p>{loadError}</p>
          <button type="button" onClick={() => void load()} className="min-h-9 px-3 font-medium text-lumina-text">Try again</button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 h-24 animate-pulse rounded-[16px] bg-lumina-pearl/65" aria-label="Loading reviews" />
      ) : (
        <>
          <section
            className={`mt-6 grid divide-x divide-lumina-border/65 border-y border-lumina-border/70 lg:mt-5 lg:flex lg:w-fit lg:border-0 ${
              summary.needsResponse > 0 ? "grid-cols-3" : "grid-cols-2"
            }`}
            aria-label="Reputation summary"
          >
            <div className="flex min-h-[66px] flex-col items-center justify-center px-1 py-2 text-center lg:min-h-0 lg:items-start lg:pr-7 lg:pl-0 lg:text-left">
              <span className="text-[18px] font-semibold leading-none text-lumina-text">
                {summary.count > 0 ? summary.average.toFixed(1) : "—"}
              </span>
              <span className="mt-1 text-[9px] uppercase tracking-[0.08em] text-lumina-text-muted">Average</span>
            </div>
            <div className="flex min-h-[66px] flex-col items-center justify-center px-1 py-2 text-center lg:min-h-0 lg:items-start lg:px-7 lg:text-left">
              <span className="text-[18px] font-semibold leading-none text-lumina-text">{summary.count}</span>
              <span className="mt-1 text-[9px] uppercase tracking-[0.08em] text-lumina-text-muted">Published</span>
            </div>
            {summary.needsResponse > 0 && (
              <div className="flex min-h-[66px] flex-col items-center justify-center px-1 py-2 text-center lg:min-h-0 lg:items-start lg:px-7 lg:text-left">
                <span className="text-[18px] font-semibold leading-none text-lumina-text">{summary.needsResponse}</span>
                <span className="mt-1 text-[9px] uppercase tracking-[0.08em] text-lumina-text-muted">Needs response</span>
              </div>
            )}
          </section>

          <div className="mt-5 flex items-center justify-between gap-3 lg:mt-7 lg:border-b lg:border-lumina-border/70 lg:pb-3">
            <div className="inline-flex rounded-full border border-lumina-border/70 bg-lumina-pearl/60 p-1" aria-label="Review filters">
              {(["all", "needs_response"] as ReviewFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`min-h-8 rounded-full px-3 text-[11px] font-medium transition ${
                    filter === value
                      ? "bg-lumina-black text-white"
                      : "text-lumina-text-muted hover:text-lumina-text"
                  }`}
                >
                  {value === "all" ? "All" : "Needs response"}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-lumina-text-muted">
              {visibleReviews.length} {visibleReviews.length === 1 ? "review" : "reviews"}
            </span>
          </div>

          {visibleReviews.length > 0 ? (
            <div className="mt-3 divide-y divide-lumina-border/70 lg:mt-0">
              {visibleReviews.map((review) => {
                const request = review.request_id ? requests.get(review.request_id) : undefined;
                const service = getReviewServiceLabel(request);
                const editing = editingReviewId === review.id;
                return (
                  <article key={review.id} className="py-4 lg:py-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h2 className="text-[14px] font-semibold text-lumina-text">{review.reviewer_name}</h2>
                          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-lumina-text-muted">
                            <BadgeCheck size={12} strokeWidth={1.7} aria-hidden="true" /> Verified
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <ReviewStars value={review.rating} />
                          <span className="text-[10px] text-lumina-text-muted">{formatReviewWorkspaceDate(review.created_at)}</span>
                        </div>
                      </div>
                      {!review.artist_response && !editing && (
                        <button type="button" onClick={() => openEditor(review)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-lumina-border px-3 text-[11px] font-medium text-lumina-text">
                          <MessageSquareReply size={13} strokeWidth={1.7} aria-hidden="true" /> Respond
                        </button>
                      )}
                    </div>

                    <div className="contents lg:flex lg:flex-col">
                      {service && <p className="mt-2 text-[11px] text-lumina-text-muted lg:order-2 lg:text-[12px]">{service}</p>}
                      {review.comment && <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.55] text-lumina-text lg:order-1 lg:mt-3 lg:max-w-[76ch] lg:text-[14px] lg:leading-[1.7]">{review.comment}</p>}
                    </div>

                    {review.artist_response && !editing && (
                      <div className="mt-3 border-l-2 border-lumina-blush bg-lumina-pearl/45 px-3 py-2.5 lg:mt-4 lg:max-w-[760px] lg:px-4 lg:py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted">Your response</p>
                          <p className="text-[9px] text-lumina-text-muted">{formatReviewWorkspaceDate(review.artist_response_at)}</p>
                        </div>
                        <p className="mt-1.5 whitespace-pre-line text-[12px] leading-[1.55] text-lumina-text">{review.artist_response}</p>
                      </div>
                    )}

                    {!editing && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {review.artist_response && (
                          <button type="button" onClick={() => openEditor(review)} className="min-h-7 text-[10px] font-medium text-lumina-text-muted/80 transition-colors hover:text-lumina-text">Edit response</button>
                        )}
                        {review.artist_response && (
                          <button type="button" onClick={() => void removeResponse(review)} disabled={saving} className="min-h-7 text-[10px] text-lumina-text-muted/80 transition-colors hover:text-lumina-text disabled:opacity-45">Remove response</button>
                        )}
                        {reportedReviewIds.has(review.id) ? (
                          <span className="text-[10px] text-lumina-text-muted">Reported</span>
                        ) : (
                          <button type="button" onClick={() => setReportingReview(review)} className="min-h-7 text-[10px] text-lumina-text-muted/80 transition-colors hover:text-lumina-text">Report review</button>
                        )}
                      </div>
                    )}

                    {editing && (
                      <div className="mt-3 rounded-[14px] border border-lumina-border bg-lumina-surface px-3 py-3 lg:mt-4 lg:max-w-[760px] lg:rounded-[12px] lg:border-lumina-border/65 lg:p-4">
                        <label htmlFor={`review-response-${review.id}`} className="text-[11px] font-medium text-lumina-text">Public response</label>
                        <textarea
                          id={`review-response-${review.id}`}
                          value={responseDraft}
                          onChange={(event) => {
                            setResponseDraft(event.target.value);
                            setResponseError("");
                          }}
                          rows={4}
                          maxLength={2000}
                          placeholder="Thank the client or respond thoughtfully…"
                          className="mt-2 w-full resize-y rounded-[12px] border border-lumina-border bg-lumina-surface-soft px-3 py-2.5 text-[12px] leading-[1.55] outline-none focus:border-lumina-text-muted"
                        />
                        {responseError && <p role="alert" className="mt-2 text-[11px] text-lumina-attention">{responseError}</p>}
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-[10px] text-lumina-text-muted">{responseDraft.length}/2000</span>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { setEditingReviewId(null); setResponseDraft(""); setResponseError(""); }} disabled={saving} className="min-h-9 rounded-full px-3 text-[11px] text-lumina-text-muted">Cancel</button>
                            <button type="button" onClick={() => void saveResponse(review)} disabled={saving || !responseDraft.trim()} className="min-h-9 rounded-full bg-lumina-black px-4 text-[11px] font-medium text-white disabled:opacity-45">{saving ? "Saving…" : "Save"}</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-24 items-center gap-3 border-b border-lumina-border/70 py-5 text-[12px] text-lumina-text-muted">
              <Star size={16} strokeWidth={1.6} aria-hidden="true" />
              {filter === "needs_response" ? "Every published review has a response." : "Published client reviews will appear here."}
            </div>
          )}
        </>
      )}

      {reportingReview && (
        <ReviewReportDialog
          reviewId={reportingReview.id}
          reviewerName={reportingReview.reviewer_name}
          onClose={() => setReportingReview(null)}
          onReported={(reviewId) => {
            setReportedReviewIds((current) => new Set(current).add(reviewId));
            setReportingReview(null);
          }}
        />
      )}
    </section>
  );
}
