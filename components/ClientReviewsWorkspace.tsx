"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, ChevronDown, Star } from "lucide-react";
import { useClientWorkspace } from "@/components/ClientWorkspaceContext";
import ReviewStars from "@/components/ReviewStars";
import { submitVerifiedReview } from "@/lib/review-actions";
import {
  formatReviewWorkspaceDate,
  getReviewReadyRequests,
  getReviewServiceDate,
  getReviewServiceLabel,
  type ReviewWorkspaceRequest,
  type ReviewWorkspaceReview,
} from "@/lib/review-workspace";
import { supabase } from "@/lib/supabase";

type ArtistSummary = {
  id: string;
  name: string;
  business_name: string | null;
  profile_image_url: string | null;
};

const REQUEST_COLUMNS =
  "id, artist_id, client_id, artist_name, artist_image_url, service_requested, requested_services, status, client_status, booking_status, scheduled_for, expected_end_at, completed_at, completion_protocol_version, appointment_confirmed_at, appointment_exception_reason, artist_completion_response, client_completion_response, client_hidden, created_at";

const REVIEW_COLUMNS =
  "id, artist_id, client_id, request_id, reviewer_name, rating, comment, created_at, artist_response, artist_response_at, moderation_status";

function ClientReviewRow({
  review,
  request,
  artist,
}: {
  review: ReviewWorkspaceReview;
  request?: ReviewWorkspaceRequest;
  artist?: ArtistSummary;
}) {
  const professionalName = artist?.name || request?.artist_name || "Professional";
  const service = getReviewServiceLabel(request);

  return (
    <article className="border-b border-lumina-border/70 py-4 last:border-b-0 lg:rounded-[20px] lg:border lg:bg-lumina-surface lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-lumina-text">
            {professionalName}
          </h3>
          {artist?.business_name && (
            <p className="mt-0.5 truncate text-[11px] text-lumina-text-muted">
              {artist.business_name}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <ReviewStars value={review.rating} />
            <span className="text-[10px] text-lumina-text-muted">
              {formatReviewWorkspaceDate(review.created_at)}
            </span>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-lumina-text-muted">
          <BadgeCheck size={13} strokeWidth={1.7} aria-hidden="true" />
          Verified
        </span>
      </div>

      {service && (
        <p className="mt-2 text-[11px] text-lumina-text-muted">{service}</p>
      )}
      {review.comment && (
        <p className="mt-2 line-clamp-3 whitespace-pre-line text-[13px] leading-[1.55] text-lumina-text">
          {review.comment}
        </p>
      )}

      {review.artist_response && (
        <div className="mt-3 border-l-2 border-lumina-blush bg-lumina-pearl/45 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted">
              Professional response
            </p>
            <p className="shrink-0 text-[9px] text-lumina-text-muted">
              {formatReviewWorkspaceDate(review.artist_response_at)}
            </p>
          </div>
          <p className="mt-1.5 whitespace-pre-line text-[12px] leading-[1.55] text-lumina-text">
            {review.artist_response}
          </p>
        </div>
      )}

      {review.moderation_status === "pending" && (
        <p className="mt-2 text-[10px] text-lumina-text-muted">
          Retained privately while Lumina reviews the appointment exception.
        </p>
      )}
    </article>
  );
}

export default function ClientReviewsWorkspace() {
  const searchParams = useSearchParams();
  const { notifications, acknowledgeNotifications, reviewReadyCount } =
    useClientWorkspace();
  const [requests, setRequests] = useState<ReviewWorkspaceRequest[]>([]);
  const [reviews, setReviews] = useState<ReviewWorkspaceReview[]>([]);
  const [artists, setArtists] = useState<Map<string, ArtistSummary>>(new Map());
  const [reviewerName, setReviewerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const handledDeepLinkRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoadError("");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setLoadError("Your reviews could not be loaded.");
      setLoading(false);
      return;
    }

    const [requestResult, reviewResult, profileResult] = await Promise.all([
      supabase
        .from("client_requests")
        .select(REQUEST_COLUMNS)
        .eq("client_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("reviews")
        .select(REVIEW_COLUMNS)
        .eq("client_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]);

    if (requestResult.error || reviewResult.error) {
      setLoadError("Your reviews could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    const nextRequests = (requestResult.data || []) as ReviewWorkspaceRequest[];
    const artistIds = [...new Set(nextRequests.map((request) => request.artist_id))];
    const artistResult = artistIds.length
      ? await supabase
          .from("artists")
          .select("id, name, business_name, profile_image_url")
          .in("id", artistIds)
      : { data: [], error: null };

    setRequests(nextRequests);
    setReviews((reviewResult.data || []) as ReviewWorkspaceReview[]);
    setArtists(
      new Map(
        ((artistResult.data || []) as ArtistSummary[]).map((artist) => [
          artist.id,
          artist,
        ])
      )
    );
    setReviewerName(
      profileResult.data?.full_name?.trim() ||
        user.user_metadata?.full_name?.trim() ||
        user.email ||
        ""
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, reviewReadyCount]);

  const requestMap = useMemo(
    () => new Map(requests.map((request) => [request.id, request])),
    [requests]
  );
  const readyRequests = useMemo(
    () => getReviewReadyRequests(requests, reviews),
    [requests, reviews]
  );

  useEffect(() => {
    const requestedId = searchParams.get("request");
    if (
      !requestedId ||
      handledDeepLinkRef.current === requestedId ||
      !readyRequests.some((request) => request.id === requestedId)
    ) {
      return;
    }
    handledDeepLinkRef.current = requestedId;
    const frame = window.requestAnimationFrame(() => {
      setExpandedRequestId(requestedId);
      void acknowledgeNotifications({ requestId: requestedId, kind: "action" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [acknowledgeNotifications, readyRequests, searchParams]);

  const openReview = (requestId: string) => {
    setExpandedRequestId((current) => (current === requestId ? null : requestId));
    setRating(5);
    setComment("");
    setFormError("");
    void acknowledgeNotifications({ requestId, kind: "action" });
  };

  const submit = async (request: ReviewWorkspaceRequest) => {
    const normalizedComment = comment.trim();
    if (!reviewerName) {
      setFormError("Add your name in Profile / Settings before reviewing.");
      return;
    }
    if (!normalizedComment) {
      setFormError("Share a few words about your experience.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    const { data, error } = await submitVerifiedReview({
      requestId: request.id,
      reviewerName,
      rating,
      comment: normalizedComment,
    });
    setSubmitting(false);

    if (error || !data) {
      setFormError(
        error?.code === "23505"
          ? "This appointment already has a review."
          : error?.code === "42501"
            ? "This appointment is not currently eligible for a verified review."
            : "Your review could not be submitted. Please try again."
      );
      if (error?.code === "23505") void load();
      return;
    }

    setReviews((current) => [data, ...current]);
    setExpandedRequestId(null);
    setRating(5);
    setComment("");
    await acknowledgeNotifications({ requestId: request.id, kind: "action" });
  };

  return (
    <section className="mx-auto w-full max-w-[1040px] px-3 py-5 md:px-8 md:py-8 lg:px-10 lg:py-12">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted lg:text-[11px]">
          Your experience
        </p>
        <h1
          className="mt-1 text-[28px] font-semibold leading-none text-lumina-text lg:text-[44px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Reviews
        </h1>
        <p className="mt-2 text-[12px] leading-[1.5] text-lumina-text-muted lg:text-[14px]">
          Share verified feedback after eligible Lumina appointments.
        </p>
      </header>

      {loadError && (
        <div className="mt-5 flex items-center justify-between gap-3 border-y border-lumina-border py-3 text-[12px] text-lumina-text-muted">
          <p>{loadError}</p>
          <button type="button" onClick={() => void load()} className="min-h-9 px-3 font-medium text-lumina-text">
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3" aria-label="Loading reviews">
          <div className="h-24 animate-pulse rounded-[16px] bg-lumina-pearl/65" />
          <div className="h-28 animate-pulse rounded-[16px] bg-lumina-pearl/45" />
        </div>
      ) : (
        <>
          {readyRequests.length > 0 && (
            <section className="mt-6" aria-labelledby="review-ready-heading">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">
                    Ready when you are
                  </p>
                  <h2 id="review-ready-heading" className="mt-1 text-[19px] font-medium text-lumina-text">
                    Review ready
                  </h2>
                </div>
                <span className="text-[11px] text-lumina-text-muted">
                  {readyRequests.length}
                </span>
              </div>

              <div className="mt-2 space-y-2.5">
                {readyRequests.map((request) => {
                  const artist = artists.get(request.artist_id);
                  const isExpanded = expandedRequestId === request.id;
                  const hasUnreadAttention = notifications.some(
                    (notification) =>
                      notification.request_id === request.id &&
                      notification.title === "Appointment Completed" &&
                      !notification.is_read
                  );
                  const name = artist?.name || request.artist_name || "Professional";
                  const image = artist?.profile_image_url || request.artist_image_url;
                  const service = getReviewServiceLabel(request) || "Completed service";
                  const date = formatReviewWorkspaceDate(getReviewServiceDate(request));

                  return (
                    <article
                      key={request.id}
                      className={`overflow-hidden rounded-[17px] border transition ${
                        hasUnreadAttention
                          ? "border-lumina-attention/25 bg-lumina-blush/55 shadow-[0_8px_24px_rgba(80,60,70,0.06)]"
                          : "border-lumina-border/75 bg-lumina-surface"
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[12px] font-medium">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            name.charAt(0).toUpperCase()
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-[14px] font-semibold text-lumina-text">{name}</h3>
                            {hasUnreadAttention && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lumina-attention" aria-label="New" />}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-lumina-text-muted">{service}</p>
                          <p className="mt-1 text-[10px] text-lumina-text-muted">
                            {date ? `${date} · ` : ""}Verified Lumina appointment
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openReview(request.id)}
                          aria-expanded={isExpanded}
                          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-lumina-black px-3 text-[11px] font-medium text-white min-[410px]:gap-1.5 min-[410px]:px-3.5"
                        >
                          {isExpanded ? "Close" : "Leave a review"}
                          <ChevronDown size={13} className={isExpanded ? "rotate-180" : ""} aria-hidden="true" />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-lumina-border/65 bg-white/65 px-3.5 py-4">
                          <div className="flex items-center gap-2 text-[10px] font-medium text-lumina-text-muted">
                            <BadgeCheck size={14} strokeWidth={1.7} aria-hidden="true" />
                            Your review will stay linked to this completed appointment.
                          </div>
                          <div className="mt-3">
                            <ReviewStars value={rating} interactive onChange={setRating} size="editor" />
                          </div>
                          <textarea
                            value={comment}
                            onChange={(event) => {
                              setComment(event.target.value);
                              setFormError("");
                            }}
                            rows={4}
                            maxLength={5000}
                            placeholder="Share your experience…"
                            className="mt-3 w-full resize-y rounded-[13px] border border-lumina-border bg-lumina-surface px-3.5 py-3 text-[13px] leading-[1.55] outline-none placeholder:text-lumina-text-muted/70 focus:border-lumina-text-muted"
                          />
                          {formError && <p role="alert" className="mt-2 text-[11px] text-lumina-attention">{formError}</p>}
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-[10px] text-lumina-text-muted">{comment.length}/5000</span>
                            <button
                              type="button"
                              onClick={() => void submit(request)}
                              disabled={submitting}
                              className="min-h-10 rounded-full bg-lumina-black px-5 text-[12px] font-medium text-white disabled:opacity-45"
                            >
                              {submitting ? "Submitting…" : "Submit review"}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <section className={readyRequests.length > 0 ? "mt-7" : "mt-6"} aria-labelledby="past-reviews-heading">
            <div className="flex items-end justify-between gap-3 border-b border-lumina-border/70 pb-2">
              <h2 id="past-reviews-heading" className="text-[19px] font-medium text-lumina-text">
                Past reviews
              </h2>
              {reviews.length > 0 && <span className="text-[11px] text-lumina-text-muted">{reviews.length}</span>}
            </div>
            {reviews.length > 0 ? (
              <div className="lg:mt-4 lg:grid lg:grid-cols-2 lg:gap-4">
                {reviews.map((review) => (
                  <ClientReviewRow
                    key={review.id}
                    review={review}
                    request={review.request_id ? requestMap.get(review.request_id) : undefined}
                    artist={artists.get(review.artist_id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-16 items-center gap-2.5 py-4 text-[12px] text-lumina-text-muted">
                <Star size={15} strokeWidth={1.6} aria-hidden="true" />
                Your submitted reviews will appear here.
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
