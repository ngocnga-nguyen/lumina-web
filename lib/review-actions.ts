import { supabase } from "@/lib/supabase";
import type { ReviewWorkspaceReview } from "@/lib/review-workspace";

export async function submitVerifiedReview({
  requestId,
  reviewerName,
  rating,
  comment,
}: {
  requestId: string;
  reviewerName: string;
  rating: number;
  comment: string;
}) {
  const result = await supabase.rpc("submit_booking_lite_review", {
    p_request_id: requestId,
    p_reviewer_name: reviewerName,
    p_rating: rating,
    p_comment: comment,
  });

  return {
    data: result.data as ReviewWorkspaceReview | null,
    error: result.error,
  };
}
export async function setProfessionalReviewResponse({
  reviewId,
  response,
}: {
  reviewId: string;
  response: string | null;
}) {
  const result = await supabase.rpc("set_artist_review_response", {
    p_review_id: reviewId,
    p_response: response,
  });

  return {
    data: result.data as ReviewWorkspaceReview | null,
    error: result.error,
  };
}
