import {
  canLeaveBookingLiteReview,
  isReviewEligibleCompletion,
  type CompletionRequestLike,
} from "@/lib/request-completion";
import { formatRequestServiceSummary } from "@/lib/request-services";

export type ReviewWorkspaceRequest = CompletionRequestLike & {
  id: string;
  artist_id: string;
  client_id: string;
  artist_name?: string | null;
  artist_image_url?: string | null;
  service_requested?: string | null;
  requested_services?: unknown;
  completed_at?: string | null;
  created_at: string;
  client_hidden?: boolean | null;
};

export type ReviewWorkspaceReview = {
  id: string;
  artist_id: string;
  client_id: string;
  request_id: string | null;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  artist_response: string | null;
  artist_response_at: string | null;
  moderation_status?: "published" | "pending" | "removed" | null;
};

export function getReviewReadyRequests(
  requests: ReviewWorkspaceRequest[],
  reviews: ReviewWorkspaceReview[],
  now = new Date()
) {
  const reviewedRequestIds = new Set(
    reviews
      .map((review) => review.request_id)
      .filter((requestId): requestId is string => Boolean(requestId))
  );

  return requests.filter(
    (request) =>
      !request.client_hidden &&
      !reviewedRequestIds.has(request.id) &&
      (canLeaveBookingLiteReview(request, now) ||
        isReviewEligibleCompletion(request, now))
  );
}

export function getReviewServiceLabel(
  request: ReviewWorkspaceRequest | null | undefined
) {
  if (!request) return null;
  return formatRequestServiceSummary(request) || null;
}

export function getReviewServiceDate(
  request: ReviewWorkspaceRequest | null | undefined
) {
  if (!request) return null;
  return (
    request.completed_at ||
    request.expected_end_at ||
    request.scheduled_for ||
    request.created_at ||
    null
  );
}

export function formatReviewWorkspaceDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getPublishedReviewSummary(reviews: ReviewWorkspaceReview[]) {
  const published = reviews.filter(
    (review) => review.moderation_status !== "pending" && review.moderation_status !== "removed"
  );
  const total = published.reduce((sum, review) => sum + review.rating, 0);

  return {
    average: published.length > 0 ? total / published.length : 0,
    count: published.length,
    needsResponse: published.filter((review) => !review.artist_response?.trim())
      .length,
  };
}

export function reviewNeedsProfessionalResponse(review: ReviewWorkspaceReview) {
  return (
    review.moderation_status !== "pending" &&
    review.moderation_status !== "removed" &&
    !review.artist_response?.trim()
  );
}
