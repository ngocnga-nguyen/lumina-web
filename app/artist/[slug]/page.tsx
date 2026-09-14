"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Camera, ChevronDown, ImageIcon, Layers3, Pencil, ShieldCheck, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SaveArtistButton from "@/components/SaveArtistButton";
import ReviewReportDialog from "@/components/ReviewReportDialog";
import ClientGuidanceTip from "@/components/ClientGuidanceTip";
import PublicPageHeader from "@/components/PublicPageHeader";
import ProfessionalProfileMediaEditor from "@/components/ProfessionalProfileMediaEditor";
import { useClientOnboarding } from "@/lib/use-client-onboarding";
import { useLuminaAdminAccess } from "@/lib/use-lumina-admin-access";
import {
  setProfessionalReviewResponse,
  submitVerifiedReview,
} from "@/lib/review-actions";
import {
  canLeaveBookingLiteReview,
  isReviewEligibleCompletion,
} from "@/lib/request-completion";
import {
  buildConsultationSnapshot,
  CONSULTATION_IMAGE_BUCKET,
  CONSULTATION_IMAGE_LIMIT,
  CONSULTATION_IMAGE_MAX_BYTES,
  CONSULTATION_IMAGE_TYPES,
  type ConsultationMaintenance,
  type ConsultationSnapshotDraft,
} from "@/lib/consultation-snapshot";
import {
  getBrowseDistanceMiles,
  useBrowseGeolocation,
} from "@/lib/use-browse-geolocation";
import {
  getArtistCoverImageClass,
  getArtistCoverOverlayClass,
  normalizeArtistCoverStyle,
  type ArtistCoverStyle,
} from "@/lib/artist-cover-style";
import {
  getArtistCoverFramingStyle,
  normalizeArtistCoverFraming,
} from "@/lib/artist-cover-framing";

type Artist = {
  id: string;
  name: string;
  business_name?: string | null;
  category: string;
  location: string;
  city?: string | null;
  region?: string | null;
  price_start: number;
  bio?: string;
  cover_image_url?: string | null;
  cover_style?: ArtistCoverStyle | null;
  cover_position_x?: number | null;
  cover_position_y?: number | null;
  cover_scale?: number | null;
  profile_image_url?: string;
  social_link?: string;
  availability?: string;
  email?: string;

  is_verified?: boolean;
  years_experience?: number | null;
  experience_unit?: "new" | "months" | "years" | null;
  experience_amount?: number | null;
  location_type?: "salon" | "home_studio" | "mobile_salon" | "travels" | null;
  mobile_location_details?: string | null;
  verified_results_count?: number | null;
  repeat_client_rate?: number | null;
  verified_reviews?: boolean | null;
  is_active?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
};

type ProfileTab = "service" | "portfolio" | "results" | "reviews";

function getProfileTab(value: string | null): ProfileTab {
  return value === "portfolio" || value === "results" || value === "reviews"
    ? value
    : "service";
}

function getCompactArtistLocation(artist: Artist) {
  if (artist.city?.trim() && artist.region?.trim()) {
    return `${artist.city.trim()}, ${artist.region.trim()}`;
  }

  const parts = artist.location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 3) {
    return artist.location.replace(/\s+\d{5}(?:-\d{4})?$/, "").trim();
  }

  const region = parts.at(-1)?.replace(/\s+\d{5}(?:-\d{4})?$/, "").trim();
  return [parts.at(-2), region].filter(Boolean).join(", ");
}

type PortfolioImage = {
  id: string;
  image_url: string;
  before_image_url?: string | null;
  caption?: string | null;
  service_name?: string | null;
  result_date?: string | null;
  entry_type?: "single_photo" | "before_after";
  evidence_level?:
    | "professional_submitted"
    | "completed_service"
    | "client_confirmed";
};

type Service = {
  id: string;
  service_name: string;
  price: number | null;
  duration: string | null;
  description: string | null;
};

type ConsultationImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

type Review = {
  id: string;
  artist_id: string;
  client_id: string;
  request_id: string;

  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;

  artist_response: string | null;
  artist_response_at: string | null;
  moderation_status?: "published" | "pending" | "removed";
};

export default function ArtistProfile() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const artistId = params.slug as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [selectedPortfolioImage, setSelectedPortfolioImage] =
    useState<PortfolioImage | null>(null);
    const [toast, setToast] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [verifiedLicenseArtistId, setVerifiedLicenseArtistId] = useState<
    string | null
  >(null);
  const [profileAccessResolved, setProfileAccessResolved] = useState(false);
  const [privatePreview, setPrivatePreview] = useState(false);
  const [reportingReview, setReportingReview] = useState<Review | null>(null);
  const [reportedReviewIds, setReportedReviewIds] = useState<Set<string>>(
    new Set()
  );
  const [replyingToReviewId, setReplyingToReviewId] = useState<string | null>(
  null
);
const [artistResponseDraft, setArtistResponseDraft] = useState("");
const [savingArtistResponse, setSavingArtistResponse] = useState(false);

  const [eligibleRequest, setEligibleRequest] = useState<any>(null);
const [hasReviewed, setHasReviewed] = useState(false);
const [hasPendingReview, setHasPendingReview] = useState(false);
const [averageRating, setAverageRating] = useState(0);
const formatReviewDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const [user, setUser] = useState<any>(null);
const [clientProfile, setClientProfile] = useState<any>(null);
const [accountArtistProfile, setAccountArtistProfile] = useState<any>(null);
const [accountMenuOpen, setAccountMenuOpen] = useState(false);
const isLuminaAdmin = useLuminaAdminAccess(user?.id);
  const clientOnboarding = useClientOnboarding();
  const [activeTab, setActiveTab] = useState<ProfileTab>(() =>
    getProfileTab(searchParams.get("tab"))
  );
  const [availabilityExpanded, setAvailabilityExpanded] = useState(false);
  const [profileDetailsExpanded, setProfileDetailsExpanded] = useState(true);
  const [mobileBioExpanded, setMobileBioExpanded] = useState(false);
  const [mediaEditorMode, setMediaEditorMode] = useState<
    "cover" | "avatar" | null
  >(null);
  const { userLocation } = useBrowseGeolocation({ successMessage: "" });

  useEffect(() => {
    const syncTabFromHistory = () => {
      setActiveTab(
        getProfileTab(new URLSearchParams(window.location.search).get("tab"))
      );
    };

    window.addEventListener("popstate", syncTabFromHistory);
    return () => window.removeEventListener("popstate", syncTabFromHistory);
  }, []);

  const selectProfileTab = (tab: ProfileTab) => {
    setActiveTab(tab);

    if (
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 767px)").matches
    ) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    if (tab === "service") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", tab);
    }

    const nextQuery = nextParams.toString();
    router.push(`/artist/${artistId}${nextQuery ? `?${nextQuery}` : ""}`, {
      scroll: false,
    });
  };

  const [openRequest, setOpenRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [consultationDraft, setConsultationDraft] =
    useState<ConsultationSnapshotDraft>({
      goal: "",
      avoid: "",
      maintenance: "",
      budget: "",
    });
  const [consultationImages, setConsultationImages] = useState<
    ConsultationImageDraft[]
  >([]);
  const accountName =
  accountArtistProfile?.name ||
  clientProfile?.full_name ||
  user?.user_metadata?.full_name ||
  user?.email ||
  "User";

const accountInitial = accountName.charAt(0).toUpperCase();

const accountImage =
  accountArtistProfile?.profile_image_url ||
  user?.user_metadata?.avatar_url ||
  null;
  const viewerIsArtist = Boolean(accountArtistProfile);
  const isOwnProfile = viewerIsArtist && user?.id === artistId;
  const [requestForm, setRequestForm] = useState({
    client_contact: "",
    service_requested: "",
    preferred_date: "",
    preferred_time: "",
    notes: "",
  });
  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(service.id)
  );
  const pricedSelectedServices = selectedServices.filter(
    (service) => typeof service.price === "number"
  );
  const estimatedListedTotal = pricedSelectedServices.reduce(
    (total, service) => total + (service.price || 0),
    0
  );

  const toggleRequestedService = (serviceId: string) => {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  };

  const focusServiceBuilder = () => {
    setOpenRequest(false);
    selectProfileTab("service");
    requestAnimationFrame(() => {
      document.getElementById("profile-services")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const openRequestBuilder = () => {
    if (services.length > 0 && selectedServices.length === 0) {
      focusServiceBuilder();
      return;
    }

    setOpenRequest(true);
  };

  const updateConsultationDraft = <K extends keyof ConsultationSnapshotDraft,>(
    field: K,
    value: ConsultationSnapshotDraft[K]
  ) => {
    setConsultationDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addConsultationImages = (files: FileList | null) => {
    if (!files?.length) return;

    const nextFiles = Array.from(files);
    if (consultationImages.length + nextFiles.length > CONSULTATION_IMAGE_LIMIT) {
      alert(`You can add up to ${CONSULTATION_IMAGE_LIMIT} inspiration images.`);
      return;
    }

    const invalidType = nextFiles.find(
      (file) =>
        !CONSULTATION_IMAGE_TYPES.includes(
          file.type as (typeof CONSULTATION_IMAGE_TYPES)[number]
        )
    );
    if (invalidType) {
      alert("Inspiration images must be JPEG, PNG, or WebP files.");
      return;
    }

    const oversizedFile = nextFiles.find(
      (file) => file.size > CONSULTATION_IMAGE_MAX_BYTES
    );
    if (oversizedFile) {
      alert("Each inspiration image must be 10 MB or smaller.");
      return;
    }

    setConsultationImages((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeConsultationImage = (imageId: string) => {
    setConsultationImages((current) => {
      const image = current.find((item) => item.id === imageId);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return current.filter((item) => item.id !== imageId);
    });
  };

  const resetConsultationDraft = () => {
    consultationImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setConsultationImages([]);
    setConsultationDraft({
      goal: "",
      avoid: "",
      maintenance: "",
      budget: "",
    });
  };

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });

useEffect(() => {
  const loadAccount = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser);

    if (!currentUser) {
      setClientProfile(null);
      return;
    }

    setRequestForm((currentForm) => ({
      ...currentForm,
      client_contact: currentForm.client_contact || currentUser.email || "",
    }));

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.log("Client profile fetch error:", error);
      return;
    }

    setClientProfile(profileData);

    const { data: accountArtistData } = await supabase
      .from("artists")
      .select("name, category, profile_image_url")
      .eq("id", currentUser.id)
      .maybeSingle();

    setAccountArtistProfile(accountArtistData);
  };

  loadAccount();
}, []);

  useEffect(() => {
    const fetchArtistData = async () => {
      setProfileAccessResolved(false);
      const {
        data: { user: viewer },
      } = await supabase.auth.getUser();
      const ownerPreview = viewer?.id === artistId;
      let artistQuery = supabase
        .from("artists")
        .select("*")
        .eq("id", artistId);

      if (!ownerPreview) {
        artistQuery = artistQuery.eq("is_active", true);
      }

      const { data: artistData, error: artistError } =
        await artistQuery.maybeSingle();

      if (artistError || !artistData) {
        console.log("Artist fetch error:", artistError);
        setArtist(null);
        setPrivatePreview(false);
        setProfileAccessResolved(true);
        return;
      }

      setArtist(artistData);
      setPrivatePreview(ownerPreview && !artistData.is_active);
      setProfileAccessResolved(true);

      const { data: verifiedLicense, error: licenseVerificationError } =
        await supabase.rpc("is_professional_license_verified", {
          p_artist_id: artistId,
        });

      if (licenseVerificationError) {
        console.log(
          "Professional license verification fetch error:",
          licenseVerificationError
        );
      }
      setVerifiedLicenseArtistId(
        !licenseVerificationError && verifiedLicense === true ? artistId : null
      );

      const { data: portfolioData } = await supabase
        .from("portfolio_images")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });

      setPortfolioImages(portfolioData || []);

      const { data: serviceData } = await supabase
        .from("services")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });

      setServices(serviceData || []);

      const { data: reviewData } = await supabase
        .from("reviews")
        .select("*")
        .eq("artist_id", artistId)
        .eq("moderation_status", "published")
        .order("created_at", { ascending: false });

      setReviews(reviewData || []);
      if (viewer?.id === artistId) {
        const { data: reportData, error: reportError } = await supabase
          .from("review_reports")
          .select("review_id")
          .eq("reporter_id", viewer.id);

        if (reportError) {
          console.log("Review report fetch error:", reportError);
        }

        setReportedReviewIds(
          new Set((reportData || []).map((report) => report.review_id))
        );
      } else {
        setReportedReviewIds(new Set());
      }
      if (viewer?.id) {
  const { data: reviewableRequests, error: completedRequestsError } =
    await supabase
      .from("client_requests")
      .select(
        "id, artist_id, client_id, status, client_status, booking_status, scheduled_for, expected_end_at, completed_at, completion_protocol_version, appointment_confirmed_at, appointment_exception_reason, artist_completion_response, client_completion_response"
      )
      .eq("artist_id", artistId)
      .eq("client_id", viewer.id)
      .in("booking_status", ["booked", "completed", "needs_attention"])
      .order("created_at", { ascending: false });

  if (completedRequestsError) {
    console.log(completedRequestsError);
  }

  const { data: ownReviewData } = await supabase
    .from("reviews")
    .select("request_id, moderation_status")
    .eq("artist_id", artistId)
    .eq("client_id", viewer.id);

  const reviewedRequestIds = new Set(
    (ownReviewData || []).map((review) => review.request_id)
  );
  const pendingReviewExists = (ownReviewData || []).some(
    (review) => review.moderation_status === "pending"
  );

  const requestedRequestId = new URLSearchParams(window.location.search).get(
    "request"
  );

  const nextEligibleRequest =
    reviewableRequests?.find(
      (request) =>
        request.id === requestedRequestId &&
        (isReviewEligibleCompletion(request) ||
          canLeaveBookingLiteReview(request)) &&
        !reviewedRequestIds.has(request.id)
    ) ||
    reviewableRequests?.find(
      (request) =>
        (isReviewEligibleCompletion(request) ||
          canLeaveBookingLiteReview(request)) &&
        !reviewedRequestIds.has(request.id)
    ) || null;

  setEligibleRequest(nextEligibleRequest);
  setHasPendingReview(pendingReviewExists);
  setHasReviewed(
    Boolean(ownReviewData?.length) && !nextEligibleRequest
  );
} else {
  setEligibleRequest(null);
  setHasReviewed(false);
  setHasPendingReview(false);
}

const ratings = (reviewData || []).map((review) => review.rating);

const nextAverageRating =
  ratings.length > 0
    ? ratings.reduce((total, rating) => total + rating, 0) /
      ratings.length
    : 0;

setAverageRating(nextAverageRating);
    };

    if (artistId) fetchArtistData();
  }, [artistId]);

  useEffect(() => {
    if (
      activeTab === "reviews" &&
      eligibleRequest &&
      new URLSearchParams(window.location.search).get("tab") === "reviews"
    ) {
      requestAnimationFrame(() => {
        document.getElementById("leave-review")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }
  }, [activeTab, eligibleRequest]);

  const handleRequestSubmit = async () => {
    if (accountArtistProfile) {
      alert("Professional accounts cannot send client requests.");
      return;
    }

    if (!artist) return;

    if (services.length > 0 && selectedServices.length === 0) {
      alert("Please select at least one service.");
      return;
    }

    if (services.length === 0 && !requestForm.service_requested.trim()) {
      alert("Please enter the service you are requesting.");
      return;
    }

    if (!requestForm.client_contact) {
      alert("Please enter your contact info.");
      return;
    }

    setRequestLoading(true);
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  setRequestLoading(false);
  alert("Please log in or create a client account before sending a request.");
  return;
}
    const clientName =
      clientProfile?.full_name ||
      user.user_metadata?.full_name ||
      user.email;

    if (!clientName) {
      setRequestLoading(false);
      alert("Please add your name in Account Settings before sending a request.");
      return;
    }
    const serviceSummary =
      selectedServices.map((service) => service.service_name).join(", ") ||
      requestForm.service_requested.trim();
    const requestedServices =
      selectedServices.length > 0
        ? selectedServices.map((service) => ({ service_id: service.id }))
        : null;

    const requestId = crypto.randomUUID();
    const uploadedConsultationPaths: string[] = [];

    for (const image of consultationImages) {
      const extension =
        image.file.type === "image/png"
          ? "png"
          : image.file.type === "image/webp"
            ? "webp"
            : "jpg";
      const filePath = `${user.id}/${requestId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(CONSULTATION_IMAGE_BUCKET)
        .upload(filePath, image.file, {
          contentType: image.file.type,
          upsert: false,
        });

      if (uploadError) {
        if (uploadedConsultationPaths.length > 0) {
          await supabase.storage
            .from(CONSULTATION_IMAGE_BUCKET)
            .remove(uploadedConsultationPaths);
        }
        setRequestLoading(false);
        alert(`Your inspiration images could not be uploaded. ${uploadError.message}`);
        return;
      }

      uploadedConsultationPaths.push(filePath);
    }

    const consultationSnapshot = buildConsultationSnapshot(
      consultationDraft,
      uploadedConsultationPaths
    );

    const { data: insertedRequest, error } = await supabase
      .from("client_requests")
      .insert([
        {
        id: requestId,
        artist_id: artist.id,
        artist_name: artist.name,
        artist_image_url: artist.profile_image_url || null,
        artist_slug: artist.id,
        artist_category: artist.category || null,

        client_id: user.id,
        client_name: clientName,
        client_contact: requestForm.client_contact,
        service_requested: serviceSummary,
        requested_services: requestedServices,
        consultation_snapshot: consultationSnapshot,
        preferred_date: requestForm.preferred_date || null,
        preferred_time: requestForm.preferred_time,
        notes: requestForm.notes,
        status: "new",
        client_status: "pending",
        booking_status: "pending",
        artist_hidden: false,
        client_hidden: false,
        },
      ])
      .select("id")
      .single();

    if (error) {
      if (uploadedConsultationPaths.length > 0) {
        await supabase.storage
          .from(CONSULTATION_IMAGE_BUCKET)
          .remove(uploadedConsultationPaths);
      }
      setRequestLoading(false);
      alert(error.message);
      return;
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: artist.id,
        request_id: insertedRequest.id,
        title: "New Request",
        message: `${clientName} sent you a service request.`,
      });

    if (notificationError) {
      console.log("New request notification error:", notificationError);
    }

    if (artist.email) {
      await fetch("/api/send-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artistEmail: artist.email,
          artistName: artist.name,
          clientName,
          clientContact: requestForm.client_contact,
          service: serviceSummary,
          date: requestForm.preferred_date,
          time: requestForm.preferred_time,
          notes: requestForm.notes,
        }),
      });
    }

    setRequestLoading(false);
    setOpenRequest(false);

    setRequestForm({
      client_contact: user.email || "",
      service_requested: "",
      preferred_date: "",
      preferred_time: "",
      notes: "",
    });
    setSelectedServiceIds([]);
    resetConsultationDraft();

    alert("Request sent ✨");
  };

  const saveArtistResponse = async (review: Review) => {
  const response = artistResponseDraft.trim();

  if (!user || user.id !== review.artist_id) {
    alert("Only this professional can respond to the review.");
    return;
  }

  if (!response) {
    alert("Please write a response first.");
    return;
  }

  if (response.length > 2000) {
    alert("Your response must be 2,000 characters or fewer.");
    return;
  }

  setSavingArtistResponse(true);

  const { data: responseData, error } = await setProfessionalReviewResponse({
    reviewId: review.id,
    response,
  });
  const data = responseData as Review | null;

  setSavingArtistResponse(false);

  if (error) {
  console.error("Artist response error:", error);

  if (error.code === "42501") {
    alert(
      "You don't have permission to respond to this review. Please make sure you are signed in as the profile owner."
    );
    return;
  }

  alert("We couldn't save your response. Please try again.");
  return;
}

  if (!data) return;

  setReviews((currentReviews) =>
    currentReviews.map((currentReview) =>
      currentReview.id === review.id ? data : currentReview
    )
  );

  setReplyingToReviewId(null);
  setArtistResponseDraft("");
};

const removeArtistResponse = async (review: Review) => {
  if (!user || user.id !== review.artist_id) {
    alert("Only this professional can remove the response.");
    return;
  }

  const confirmed = window.confirm(
    "Remove your public response from this review?"
  );

  if (!confirmed) return;

  setSavingArtistResponse(true);

  const { data: responseData, error } = await setProfessionalReviewResponse({
    reviewId: review.id,
    response: null,
  });
  const data = responseData as Review | null;

  setSavingArtistResponse(false);

  if (error) {
  console.error("Remove artist response error:", error);

  if (error.code === "42501") {
    alert(
      "You don't have permission to remove this response."
    );
    return;
  }

  alert("We couldn't remove your response. Please try again.");
  return;
}

  if (!data) return;

  setReviews((currentReviews) =>
    currentReviews.map((currentReview) =>
      currentReview.id === review.id ? data : currentReview
    )
  );

  setReplyingToReviewId(null);
  setArtistResponseDraft("");
};

  const handleSubmitReview = async () => {
    if (!artist) return;
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  alert("Please log in with a client account before leaving a review.");
  return;
}

if (user.id === artist.id) {
  alert("You cannot review your own professional profile.");
  return;
}
if (!eligibleRequest) {
  alert(
    "You can only leave a review after completing an appointment with this professional."
  );
  return;
}
    const reviewerName =
      clientProfile?.full_name ||
      user.user_metadata?.full_name ||
      user.email;

    if (!reviewerName) {
      alert("Please add your name in Account Settings before leaving a review.");
      return;
    }

    if (!reviewForm.comment.trim()) {
      alert("Please write your review.");
      return;
    }

    const { data: submittedReview, error } = await submitVerifiedReview({
      requestId: eligibleRequest.id,
      reviewerName,
      rating: reviewForm.rating,
      comment: reviewForm.comment.trim(),
    });

    if (error) {
  if (error.code === "23505") {
    alert("You have already reviewed this appointment.");
    setEligibleRequest(null);
    setHasReviewed(true);
    return;
  }

  if (error.code === "42501") {
    alert(
      "This review could not be linked to an eligible Lumina appointment. Please check the appointment time and sign-in account."
    );
    return;
  }

  alert("We couldn't submit your review. Please try again.");
  console.error("Review submission error:", error);
  return;
}

    const data = submittedReview as Review | null;
    if (!data) return;
    const reviewIsPending = data.moderation_status === "pending";
    const updatedReviews = reviewIsPending ? reviews : [data, ...reviews];

setReviews(updatedReviews);
setEligibleRequest(null);
setHasReviewed(true);
setHasPendingReview((current) => current || reviewIsPending);

const updatedAverage = updatedReviews.length
  ? updatedReviews.reduce(
      (total, review) => total + review.rating,
      0
    ) / updatedReviews.length
  : 0;

setAverageRating(updatedAverage);

    setReviewForm({
      rating: 5,
      comment: "",
    });

    alert(
      reviewIsPending
        ? "Your review and account of the appointment were saved. Because an exception was reported, the review is pending future moderation."
        : "Review submitted ✨"
    );
  };

  if (!artist) {
    return (
      <main className="min-h-screen bg-lumina-surface px-4 py-10 text-lumina-text md:px-10">
        <Link href="/browse">← Back</Link>
        <p className="mt-8 text-lumina-text-muted">
          {profileAccessResolved
            ? "This professional profile is not currently active."
            : "Loading artist profile..."}
        </p>
      </main>
    );
  }

  const experienceLabel =
    artist.experience_unit === "new"
      ? "New Artist"
      : artist.experience_amount && artist.experience_unit
        ? `${artist.experience_amount} ${artist.experience_unit === "months" ? "Months" : "Years"} Experience`
        : artist.years_experience
          ? `${artist.years_experience} Years Experience`
          : null;
  const portfolioPhotos = portfolioImages.filter(
    (image) => image.entry_type !== "before_after"
  );
  const results = portfolioImages.filter(
    (image) => image.entry_type === "before_after"
  );
  const availabilitySummary =
    artist.availability?.trim().split("\n").find(Boolean) ||
    "Availability coming soon.";
  const profileBio =
    artist.bio ||
    `Professional ${artist.category.toLowerCase()} serving clients in ${artist.location}.`;
  const mobileCoverImage =
    artist.cover_image_url ||
    portfolioPhotos[0]?.image_url ||
    artist.profile_image_url ||
    null;
  const mobileCoverStyle = normalizeArtistCoverStyle(artist.cover_style);
  const mobileCoverFraming = normalizeArtistCoverFraming(
    artist.cover_position_x,
    artist.cover_position_y,
    artist.cover_scale
  );
  const mobileCoverImageClass = getArtistCoverImageClass(mobileCoverStyle);
  const mobileCoverOverlayClass =
    getArtistCoverOverlayClass(mobileCoverStyle);
  const distanceMiles =
    userLocation &&
    typeof artist.latitude === "number" &&
    typeof artist.longitude === "number"
      ? getBrowseDistanceMiles(
          userLocation,
          artist.latitude,
          artist.longitude
        )
      : null;
  const publicWorkCount = portfolioPhotos.length + results.length;
  const mobileBioNeedsToggle = profileBio.length > 170;
  const compactLocation = getCompactArtistLocation(artist);
  const mobileServiceChips = Array.from(
    new Set(
      services
        .map((service) => service.service_name.trim())
        .filter(Boolean)
    )
  ).slice(0, 3);
  const mobileAvatarClassName = `relative z-10 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-lumina-surface/65 shadow-[0_3px_10px_rgba(39,36,40,0.07)] ${
    artist.profile_image_url ? "bg-transparent" : "bg-lumina-pearl"
  }`;
  const mobileAvatarContent = artist.profile_image_url ? (
    <img
      src={artist.profile_image_url}
      alt={artist.name}
      className="h-full w-full object-cover"
    />
  ) : (
    <span className="text-[30px] font-semibold text-lumina-text" aria-hidden="true">
      {artist.name.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <main data-lumina-public-page className="min-h-screen bg-lumina-surface text-lumina-text">
      <PublicPageHeader
        backHref="/browse"
        backLabel="Back"
        accountControl={
          <div className="relative justify-self-end">
  {user ? (
    <>
      <button
        onClick={() => setAccountMenuOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-80"
        aria-label="Account menu"
      >
        {accountImage ? (
          <img
            src={accountImage}
            alt={accountName}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lumina-black text-[13px] font-medium text-white">
            {accountInitial}
          </span>
        )}
      </button>

      {accountMenuOpen && (
        <div className="absolute right-0 top-12 z-50 w-[220px] rounded-[20px] border border-lumina-glass-border bg-lumina-surface/95 p-2 text-lumina-text shadow-xl backdrop-blur-[14px]">
          <div className="mb-2 border-b border-lumina-border pb-2">
            <p className="truncate px-3 pt-2 text-[14px] font-medium">
              {accountName}
            </p>
            <p className="truncate px-3 pb-2 text-[12px] text-lumina-text-muted">
              {accountArtistProfile?.category || "Client account"}
            </p>
          </div>

          {accountArtistProfile ? (
            <>
              <Link
                href="/dashboard"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-lumina-blush/70"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/profile"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-lumina-blush/70"
              >
                Edit Profile
              </Link>
              <Link
                href="/dashboard/settings"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-lumina-blush/70"
              >
                Settings &amp; Privacy
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/saved"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-lumina-blush/70"
              >
                Saved Artists
              </Link>
              <Link
                href="/my-requests"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-lumina-blush/70"
              >
                My Requests
              </Link>
              <Link
                href="/account"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-lumina-blush/70"
              >
                Account
              </Link>
            </>
          )}
          {isLuminaAdmin && (
            <Link
              href="/admin/reviews"
              className="flex items-center gap-2 rounded-[14px] px-4 py-3 text-sm hover:bg-lumina-blush/70"
            >
              <ShieldCheck size={15} strokeWidth={1.6} aria-hidden="true" />
              Admin / Moderation
            </Link>
          )}
        </div>
      )}
    </>
  ) : (
    <Link
      href="/login"
      className="text-sm transition hover:opacity-70"
    >
      Login
    </Link>
  )}
</div>
        }
      />

      {privatePreview && (
        <div className="border-b border-lumina-glass-border bg-lumina-glass px-4 py-3 text-center text-[12px] text-lumina-text md:px-10">
          <span className="font-semibold">Private preview</span>
          <span className="mx-2 text-lumina-border">•</span>
          Not currently active or visible in Lumina discovery
        </div>
      )}

      <section className="md:hidden">
        <div className="relative h-[190px] overflow-hidden bg-lumina-pearl sm:h-[220px]">
          {mobileCoverImage ? (
            <img
              src={mobileCoverImage}
              alt=""
              aria-hidden="true"
              className={mobileCoverImageClass}
              style={getArtistCoverFramingStyle(
                mobileCoverFraming,
                mobileCoverStyle
              )}
            />
          ) : (
            <div className="h-full w-full bg-lumina-glass" />
          )}
          {mobileCoverImage && mobileCoverOverlayClass && (
            <span className={mobileCoverOverlayClass} aria-hidden="true" />
          )}
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setMediaEditorMode("cover")}
              className="absolute right-3 top-3 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-lumina-glass-border bg-lumina-surface/88 px-3 text-[11px] font-medium text-lumina-text shadow-sm backdrop-blur-[10px]"
              aria-label="Edit cover image"
            >
              <Pencil size={13} aria-hidden="true" /> Edit cover
            </button>
          )}
        </div>

        <div className="relative -mt-16 rounded-b-[24px] border-x border-b border-lumina-glass-border/45 bg-lumina-glass/85 px-4 pb-4 shadow-[0_10px_24px_rgba(39,36,40,0.035)] backdrop-blur-[12px]">
          <div className="relative z-10">
          <div className="-mt-12 flex items-end justify-between gap-4">
            {isOwnProfile ? (
              <button
                type="button"
                onClick={() => setMediaEditorMode("avatar")}
                aria-label="Change profile photo"
                className={`group ${mobileAvatarClassName}`}
              >
                {mobileAvatarContent}
                <span className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-lumina-black/55 text-white opacity-95">
                  <Camera size={13} aria-hidden="true" />
                </span>
              </button>
            ) : (
              <div className={mobileAvatarClassName}>{mobileAvatarContent}</div>
            )}

            <div className="relative z-10 mb-2">
              <SaveArtistButton
                artistId={artist.id}
                artistName={artist.name}
                viewerIsArtist={viewerIsArtist}
              />
            </div>
          </div>

          <div className="mt-2.5">
            <h1
              className="break-words text-[clamp(26px,7.4vw,30px)] font-semibold leading-[1.05] text-lumina-text"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {artist.name}
            </h1>
            {artist.business_name && (
              <p className="mt-0.5 text-[15px] leading-[1.35] text-lumina-text-muted">
                {artist.business_name}
              </p>
            )}
            <p className="mt-1.5 text-[13px] leading-[1.45] text-lumina-text-muted">
              {artist.category} · {compactLocation}
              {distanceMiles !== null && (
                <> · {distanceMiles.toFixed(1)} mi away</>
              )}
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-lumina-text">
              Starting at ${artist.price_start}
            </p>
            {artist.location_type === "mobile_salon" && (
              <p className="mt-2 text-[12px] leading-[1.45] text-lumina-text-muted">
                Mobile salon — exact appointment location is shared after
                confirmation.
                {artist.mobile_location_details
                  ? ` ${artist.mobile_location_details}`
                  : ""}
              </p>
            )}
            {artist.location_type === "travels" && (
              <p className="mt-2 text-[12px] leading-[1.45] text-lumina-text-muted">
                Exact service details are shared after booking confirmation.
              </p>
            )}
          </div>

          {isOwnProfile && (
            <p className="mt-3 inline-flex rounded-full border border-lumina-border bg-lumina-surface-soft px-3 py-1.5 text-[11px] font-medium text-lumina-text-muted">
              {privatePreview
                ? "Private preview · Not currently active"
                : "This is your public profile"}
            </p>
          )}

          {(verifiedLicenseArtistId === artistId || reviews.length > 0 || publicWorkCount > 0) && (
            <div
              className="mt-3 flex flex-wrap gap-x-3 gap-y-2"
              aria-label="Professional highlights"
            >
              {verifiedLicenseArtistId === artistId && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-lumina-text">
                  <ShieldCheck size={15} strokeWidth={1.7} aria-hidden="true" />
                  License verified
                </span>
              )}
              {reviews.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[12px] text-lumina-text">
                  <Star size={14} strokeWidth={1.7} aria-hidden="true" />
                  {averageRating.toFixed(1)} ({reviews.length}{" "}
                  {reviews.length === 1 ? "review" : "reviews"})
                </span>
              )}
              {publicWorkCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-lumina-text">
                  {results.length > 0 ? (
                    <Layers3 size={14} strokeWidth={1.7} aria-hidden="true" />
                  ) : (
                    <ImageIcon size={14} strokeWidth={1.7} aria-hidden="true" />
                  )}
                  {publicWorkCount}{" "}
                  {publicWorkCount === 1 ? "work sample" : "work samples"}
                </span>
              )}
            </div>
          )}

          {mobileServiceChips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Services offered">
              {mobileServiceChips.map((serviceName) => (
                <span
                  key={serviceName}
                  className="rounded-full border border-lumina-border bg-lumina-surface/75 px-2.5 py-1 text-[11px] text-lumina-text"
                >
                  {serviceName}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3">
            <p
              className={`whitespace-pre-line text-[14px] leading-[1.55] text-lumina-text ${
                mobileBioExpanded ? "" : "line-clamp-3"
              }`}
            >
              {profileBio}
            </p>
            {mobileBioNeedsToggle && (
              <button
                type="button"
                onClick={() => setMobileBioExpanded((expanded) => !expanded)}
                aria-expanded={mobileBioExpanded}
                className="mt-1.5 min-h-8 text-[12px] font-medium text-lumina-text underline decoration-lumina-border underline-offset-4"
              >
                {mobileBioExpanded ? "Show less" : "See more"}
              </button>
            )}
          </div>

          <div className="mt-3 rounded-[16px] border border-lumina-glass-border/70 bg-lumina-glass/50 px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-[10px]">
            <button
              type="button"
              onClick={() => setAvailabilityExpanded((expanded) => !expanded)}
              aria-expanded={availabilityExpanded}
              aria-controls="mobile-profile-availability-details"
              className="flex min-h-11 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-attention/40"
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-[14px] font-medium text-lumina-text">
                  Availability
                </h2>
                {!availabilityExpanded && (
                  <p className="mt-0.5 truncate text-[12px] text-lumina-text-muted">
                    {availabilitySummary}
                  </p>
                )}
              </div>
              <ChevronDown
                size={15}
                strokeWidth={1.6}
                aria-hidden="true"
                className={`shrink-0 text-lumina-text-muted transition-transform duration-150 ${
                  availabilityExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
            {availabilityExpanded && (
              <div
                id="mobile-profile-availability-details"
                className="border-t border-lumina-border pb-3 pt-2"
              >
                <p className="whitespace-pre-line text-[12px] leading-[1.5] text-lumina-text-muted">
                  {artist.availability || "Availability coming soon."}
                </p>
              </div>
            )}
          </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 pt-0 md:px-10 md:py-8">
        <div className="mx-auto w-full max-w-[1520px]">
        <div className="hidden md:grid md:grid-cols-[320px_1fr] md:gap-8 lg:grid-cols-[360px_1fr] lg:gap-14">
          <div>
            <div className="relative h-[clamp(260px,72vw,300px)] w-full overflow-hidden bg-lumina-pearl md:h-[430px]">
              {artist.profile_image_url ? (
                <img
                  src={artist.profile_image_url}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-lumina-text-muted">
                  <div>
                    <p className="text-[18px]">Profile Image</p>
                    <p className="mt-1 text-[13px]">Coming soon</p>
                  </div>
                </div>
              )}
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setMediaEditorMode("avatar")}
                  className="group absolute inset-0 flex items-end p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-surface"
                  aria-label="Change profile photo"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lumina-surface/90 px-3 py-1.5 text-[11px] text-lumina-text opacity-90 shadow-sm backdrop-blur-[8px] transition group-hover:opacity-100">
                    <Camera size={13} aria-hidden="true" /> Change photo
                  </span>
                </button>
              )}
            </div>

            <div className="mt-2 rounded-[14px] border border-lumina-border bg-lumina-surface/80 px-3 py-2 backdrop-blur-[8px] md:mt-3 md:px-3.5 md:py-2.5">
              <button
                type="button"
                onClick={() => setAvailabilityExpanded((expanded) => !expanded)}
                aria-expanded={availabilityExpanded}
                aria-controls="profile-availability-details"
                className="flex min-h-9 w-full items-center justify-between gap-3 rounded-[7px] text-left text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-attention/40 focus-visible:ring-offset-2 md:min-h-10"
              >
                <div className="min-w-0 flex-1">
                  <h2
                    className="text-[16px] md:text-[17px]"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    Availability
                  </h2>
                  {!availabilityExpanded && (
                    <p className="mt-0.5 truncate text-[12px] leading-[1.35] text-lumina-text-muted">
                      {availabilitySummary}
                    </p>
                  )}
                </div>
                <ChevronDown
                  size={15}
                  strokeWidth={1.6}
                  aria-hidden="true"
                  className={`shrink-0 text-lumina-text-muted transition-transform duration-150 ${
                    availabilityExpanded ? "rotate-180" : ""
                  }`}
                />
                <span className="sr-only">
                  {availabilityExpanded ? "Hide availability" : "Show availability"}
                </span>
              </button>

              {availabilityExpanded && (
                <div id="profile-availability-details">
                  <p className="mt-2 whitespace-pre-line border-t border-lumina-border pt-2 text-[12px] leading-[1.5] text-lumina-text-muted">
                    {artist.availability || "Availability coming soon."}
                  </p>

                  {isOwnProfile && (
                    <Link
                      href="/dashboard/profile"
                      className="mt-2.5 inline-block rounded-full border border-lumina-border bg-lumina-surface px-3.5 py-1.5 text-[11px] text-lumina-text transition hover:border-lumina-text-muted hover:bg-lumina-surface-soft"
                    >
                      Edit profile
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
  <div className="flex items-start justify-between gap-4">
    <h1
      className="text-[30px] leading-[1.03] font-semibold md:text-[36px] md:leading-[1.02] lg:text-[42px] lg:leading-[1.0]"
      style={{ fontFamily: "'Playfair Display', serif" }}
    >
      {artist.name}
    </h1>

    <div className="flex shrink-0 items-center gap-2">
      {isOwnProfile && (
        <button
          type="button"
          onClick={() => setMediaEditorMode("cover")}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-lumina-border bg-lumina-surface px-3 text-[11px] text-lumina-text transition hover:border-lumina-text-muted hover:bg-lumina-surface-soft"
        >
          <Pencil size={13} aria-hidden="true" /> Edit cover
        </button>
      )}
      <SaveArtistButton
        artistId={artist.id}
        artistName={artist.name}
        viewerIsArtist={viewerIsArtist}
      />
    </div>
</div>

            {artist.business_name && (
              <p className="mt-2 text-[15px] text-lumina-text-muted md:text-[17px]">
                {artist.business_name}
              </p>
            )}

            {isOwnProfile && (
              <p className="mt-2 inline-flex rounded-full border border-lumina-border bg-lumina-surface-soft px-3 py-1.5 text-[11px] font-medium text-lumina-text-muted md:mt-3 md:text-[12px]">
                {privatePreview
                  ? "Private preview · Not currently active"
                  : "This is your public profile"}
              </p>
            )}
              
            <p
              className="mt-1.5 text-[19px] md:mt-2 md:text-[24px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist.category}
            </p>

<div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-lumina-text-muted md:mt-6 md:gap-x-8 md:gap-y-2 md:text-[15px]">
                <span>{artist.location}</span>
              <span>Starting at ${artist.price_start}</span>
            </div>
            {artist.location_type === "mobile_salon" && (
              <div className="mt-2.5 max-w-[680px] rounded-[16px] border border-lumina-border bg-lumina-surface-soft px-3 py-2.5 text-[12px] leading-[1.5] text-lumina-text-muted md:mt-3 md:px-4 md:py-3 md:text-[13px]">
                <p>Mobile salon — exact appointment location is shared after confirmation.</p>
                {artist.mobile_location_details && <p className="mt-1">{artist.mobile_location_details}</p>}
              </div>
            )}
            {artist.location_type === "travels" && (
              <p className="mt-3 text-[13px] text-lumina-text-muted">Exact service details are shared after booking confirmation.</p>
            )}

          <div className="mt-5 max-w-[760px] border-t border-lumina-border pt-4 md:mt-8 md:pt-6 2xl:max-w-[1040px]">

<div className="flex items-center justify-between gap-4">
  <h2
    className="text-[23px] font-semibold md:text-[26px] lg:text-[30px]"
    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
  >
    Profile Details
  </h2>
  <button
    type="button"
    onClick={() => setProfileDetailsExpanded((expanded) => !expanded)}
    aria-expanded={profileDetailsExpanded}
    aria-controls="profile-supporting-details"
    className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[12px] text-lumina-text-muted transition hover:bg-lumina-blush/60 hover:text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-attention/40"
  >
    <span>{profileDetailsExpanded ? "Show less" : "Show more"}</span>
    <ChevronDown
      size={16}
      strokeWidth={1.6}
      aria-hidden="true"
      className={`transition-transform duration-150 ${
        profileDetailsExpanded ? "rotate-180" : ""
      }`}
    />
  </button>
</div>

<div
  id="profile-supporting-details"
  hidden={verifiedLicenseArtistId !== artistId && !profileDetailsExpanded}
  className="mt-4 grid grid-cols-2 gap-3 md:mt-6 md:gap-4 lg:grid-cols-3"
>
  {verifiedLicenseArtistId === artistId && (
    <div className="rounded-[16px] border border-lumina-border bg-lumina-surface p-3.5 md:rounded-[18px] md:p-5">
      <ShieldCheck size={25} strokeWidth={1.5} aria-hidden="true" />
      <p className="mt-3 text-[15px] font-medium text-lumina-text">
        License verified
      </p>
      <p className="mt-2 text-[11px] leading-[1.5] text-lumina-text-muted">
        Professional-license details reviewed by Lumina
      </p>
    </div>
  )}

  {profileDetailsExpanded && experienceLabel && (
    <div className="rounded-[16px] border border-lumina-border bg-lumina-surface p-3.5 md:rounded-[18px] md:p-5">
      <p className="text-[24px] font-semibold">{artist.experience_unit === "new" ? "New" : artist.experience_amount || artist.years_experience}</p>

      <p className="mt-2 text-[15px] text-lumina-text-muted">
        {artist.experience_unit === "new" ? "Artist" : artist.experience_unit === "months" ? "Months Experience" : "Years Experience"}
      </p>

      <p className="mt-2 text-[11px] text-lumina-text-muted">
        Provided by the professional
      </p>
    </div>
  )}

  {profileDetailsExpanded && services.length > 0 && (
    <div className="rounded-[16px] border border-lumina-border bg-lumina-surface p-3.5 md:rounded-[18px] md:p-5">
      <p className="text-[28px] font-semibold">
        {services.length}
      </p>

      <p className="mt-2 text-[15px] text-lumina-text-muted">
        {services.length === 1 ? "Service Listed" : "Services Listed"}
      </p>
    </div>
  )}

  {profileDetailsExpanded && portfolioPhotos.length > 0 && (
    <div className="rounded-[16px] border border-lumina-border bg-lumina-surface p-3.5 md:rounded-[18px] md:p-5">
      <p className="text-[28px] font-semibold">
        {portfolioPhotos.length}
      </p>

      <p className="mt-2 text-[15px] text-lumina-text-muted">
        {portfolioPhotos.length === 1 ? "Portfolio Photo" : "Portfolio Photos"}
      </p>
    </div>
  )}

  {profileDetailsExpanded && results.length > 0 && (
    <div className="rounded-[16px] border border-lumina-border bg-lumina-surface p-3.5 md:rounded-[18px] md:p-5">
      <p className="text-[28px] font-semibold">
        {results.length}
      </p>

      <p className="mt-2 text-[15px] text-lumina-text-muted">
        {results.length === 1 ? "Before & After Result" : "Before & After Results"}
      </p>

      <p className="mt-2 text-[11px] text-lumina-text-muted">
        Added by the professional
      </p>
    </div>
  )}

  {profileDetailsExpanded && reviews.length > 0 && (
    <div className="rounded-[16px] border border-lumina-border bg-lumina-surface p-3.5 md:rounded-[18px] md:p-5">
      <p className="text-[28px] font-semibold">
        {averageRating.toFixed(1)} ★
      </p>

      <p className="mt-2 text-[15px] text-lumina-text-muted">
        {reviews.length} Verified {reviews.length === 1 ? "Review" : "Reviews"}
      </p>

      <p className="mt-2 text-[11px] text-lumina-text-muted">
        Linked to completed Lumina appointments
      </p>
    </div>
  )}
</div>

<div className="mt-6 md:mt-10">
  <h3
    className="text-[23px] font-semibold md:text-[28px]"
    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
  >
    About
  </h3>

  <p
    className="mt-3 text-[15px] leading-[1.6] text-lumina-text md:mt-4 md:text-[18px] md:leading-[1.7]"
    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
  >
    {profileBio}
  </p>
</div>
            
            </div>
          </div>
      </div>

        <section className="pb-12 md:mt-6 md:pb-16">
          <div className="sticky top-0 z-30 -mx-4 grid grid-cols-4 gap-1 border-b border-lumina-glass-border/60 bg-lumina-surface/95 px-4 py-1 text-[12px] sm:flex sm:flex-wrap sm:justify-center sm:gap-6 sm:text-[15px] md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-[16px]">
            {[
              { key: "service", label: "Services" },
              { key: "portfolio", label: "Portfolio" },
              { key: "results", label: "Results" },
              { key: "reviews", label: "Reviews" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => selectProfileTab(key as ProfileTab)}
                className={`min-h-10 whitespace-nowrap border-b px-1 pb-2 pt-1 transition focus-visible:rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-attention/40 ${
                  activeTab === key
                    ? "border-lumina-text bg-transparent text-lumina-text"
                    : "border-transparent text-lumina-text-muted hover:border-lumina-border hover:bg-lumina-blush/50 hover:text-lumina-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "service" && (
            <div id="profile-services" className="mt-6 scroll-mt-6 md:mt-10">
              {services.length > 0 &&
                clientOnboarding.ready &&
                clientOnboarding.isClient &&
                !clientOnboarding.hasDismissedTip("service_selection") && (
                  <div className="mb-6">
                    <ClientGuidanceTip
                      title="Build one clear request"
                      onDismiss={() =>
                        clientOnboarding.dismissTip("service_selection")
                      }
                    >
                      Tap any service card to add or remove it. You can select
                      more than one before choosing Continue to request.
                    </ClientGuidanceTip>
                  </div>
                )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                {services.length > 0 ? (
                  services.map((service) => {
                    const selected = selectedServiceIds.includes(service.id);

                    return (
                      <button
                        key={service.id}
                        type="button"
                        disabled={viewerIsArtist}
                        aria-pressed={viewerIsArtist ? undefined : selected}
                        aria-label={
                          viewerIsArtist
                            ? undefined
                            : selected
                              ? `Remove ${service.service_name} from request`
                              : `Add ${service.service_name} to request`
                        }
                        onClick={() => toggleRequestedService(service.id)}
                        className={`group flex h-full w-full flex-col rounded-[18px] border p-4 text-left transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-attention/40 focus-visible:ring-offset-2 md:p-5 ${
                          selected
                            ? "border-lumina-attention/35 bg-lumina-glass ring-1 ring-inset ring-lumina-blush backdrop-blur-[10px] enabled:cursor-pointer enabled:hover:border-lumina-attention/45 enabled:hover:bg-lumina-blush/60"
                            : "border-lumina-border bg-transparent enabled:cursor-pointer enabled:hover:border-lumina-text-muted/35 enabled:hover:bg-lumina-surface-soft"
                        }`}
                      >
                        <h3
                          className="text-[20px] font-semibold text-lumina-text md:text-[22px]"
                          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                        >
                          {service.service_name}
                        </h3>

                        <p className="mt-1.5 text-[16px] text-lumina-text md:mt-2 md:text-[18px]">
                          {typeof service.price === "number"
                            ? `Starting at $${service.price}`
                            : "Price available by proposal"}
                        </p>

                        <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.5] text-lumina-text-muted md:mt-4 md:text-[14px] md:leading-[1.6]">
                          {service.description || "No description added."}
                        </p>

                        <div className="mt-auto flex items-center justify-between gap-3 pt-5 md:gap-4 md:pt-8">
                          {!viewerIsArtist ? (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-medium transition-colors ${
                                selected
                                  ? "border-lumina-attention/25 bg-lumina-surface/85 text-lumina-text"
                                  : "border-lumina-border bg-lumina-surface/75 text-lumina-text group-hover:border-lumina-text-muted"
                              }`}
                            >
                              {selected ? (
                                <>
                                  <span aria-hidden="true">✓</span>
                                  <span>Added</span>
                                  <span className="font-normal text-lumina-text-muted">· Remove</span>
                                </>
                              ) : (
                                "Add to request"
                              )}
                            </span>
                          ) : (
                            <span />
                          )}

                          <p className="text-right text-[13px] text-lumina-text-muted">
                            ◔ {service.duration || "Varies"}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-lumina-text-muted">Services coming soon.</p>
                )}
              </div>

              {!viewerIsArtist && selectedServices.length > 0 && (
                <div
                  aria-live="polite"
                  className="sticky bottom-2 z-20 mx-auto mt-4 max-w-[760px] rounded-[18px] border border-lumina-glass-border bg-lumina-surface/95 p-3 shadow-[0_10px_30px_rgba(39,36,40,0.08)] backdrop-blur-[14px] sm:bottom-4 sm:mt-6 sm:rounded-[20px] sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
                        Your request
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedServices.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleRequestedService(service.id)}
                            aria-label={`Remove ${service.service_name}`}
                            className="rounded-full border border-lumina-border bg-lumina-surface px-2.5 py-1 text-left text-[11px] text-lumina-text transition hover:border-lumina-text-muted sm:px-3 sm:py-1.5 sm:text-[12px]"
                          >
                            {service.service_name}
                            {typeof service.price === "number"
                              ? ` — $${service.price}`
                              : " — Price by proposal"}{" "}
                            <span aria-hidden="true">×</span>
                          </button>
                        ))}
                      </div>
                      {pricedSelectedServices.length > 0 && (
                        <p className="mt-2 text-[13px] text-lumina-text sm:mt-3 sm:text-[14px]">
                          {pricedSelectedServices.length === selectedServices.length
                            ? "Estimated total"
                            : "Estimated total for priced services"}
                          :{" "}
                          <span className="font-semibold text-lumina-black">
                            ${estimatedListedTotal.toLocaleString("en-US")}
                          </span>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenRequest(true)}
                      className="w-full shrink-0 rounded-full bg-lumina-black px-5 py-2.5 text-[13px] text-white transition hover:opacity-85 sm:w-auto sm:py-3"
                    >
                      Continue to request
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "portfolio" && (
            <div className="mx-auto mt-6 grid max-w-[1350px] grid-cols-2 gap-3 md:mt-10 md:gap-6 lg:grid-cols-3">
              {portfolioPhotos.length > 0 ? (
                portfolioPhotos.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedPortfolioImage(image)}
                    className="group text-left"
                  >
                    <img
                      src={image.image_url}
                      alt={image.caption || "Portfolio"}
                      className="aspect-[4/3] w-full rounded-[4px] object-cover transition group-hover:opacity-90"
                    />

                    {image.caption && (
                      <p className="mt-2 text-[14px] text-lumina-text-muted">
                        {image.caption}
                      </p>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-lumina-text-muted">No portfolio uploaded yet.</p>
              )}
            </div>
          )}

          {activeTab === "results" && (
            <div className="mx-auto mt-10 grid max-w-[1350px] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {results.length > 0 ? (
                results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedPortfolioImage(result)}
                    className="group overflow-hidden rounded-[18px] border border-lumina-border bg-lumina-surface-soft text-left"
                  >
                    <div className="grid grid-cols-2">
                      <div className="relative">
                        <img
                          src={result.before_image_url || ""}
                          alt="Before"
                          className="aspect-[4/3] w-full object-cover transition group-hover:opacity-90"
                        />
                        <span className="absolute bottom-3 left-3 rounded-full bg-lumina-surface/90 px-3 py-1 text-[11px] text-lumina-text">
                          Before
                        </span>
                      </div>
                      <div className="relative">
                        <img
                          src={result.image_url}
                          alt="After"
                          className="aspect-[4/3] w-full object-cover transition group-hover:opacity-90"
                        />
                        <span className="absolute bottom-3 left-3 rounded-full bg-lumina-surface/90 px-3 py-1 text-[11px] text-lumina-text">
                          After
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-lumina-text-muted">
                        <span>Before &amp; After</span>
                        {result.service_name && <><span>•</span><span>{result.service_name}</span></>}
                      </div>
                      {result.caption && (
                        <p className="mt-3 text-[14px] leading-[1.6] text-lumina-text">
                          {result.caption}
                        </p>
                      )}
                      {result.result_date && (
                        <p className="mt-3 text-[12px] text-lumina-text-muted">
                          {new Date(`${result.result_date}T00:00:00`).toLocaleDateString()}
                        </p>
                      )}
                      <p className="mt-4 text-[11px] text-lumina-text-muted">
                        Added by professional
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-lumina-text-muted">No Before &amp; After results shared yet.</p>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="mx-auto mt-10 max-w-[900px]">
              {eligibleRequest && !hasReviewed && (
              <div
                id="leave-review"
                className="rounded-[24px] border border-lumina-border bg-lumina-surface p-6"
              >
                <h3
                  className="text-[28px] font-semibold"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  Leave a review
                </h3>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[16px] bg-lumina-surface-soft px-4 py-3">
                    <p className="text-[12px] uppercase tracking-[0.12em] text-lumina-text-muted">
                      Reviewing as
                    </p>
                    <p className="mt-1 text-[14px] font-medium text-lumina-text">
                      {clientProfile?.full_name ||
                        user?.user_metadata?.full_name ||
                        user?.email}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-[14px] text-lumina-text-muted">
                      Rating
                    </p>

                    <div className="flex gap-2 text-[30px]">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() =>
                            setReviewForm({
                              ...reviewForm,
                              rating: star,
                            })
                          }
                          className={
                            star <= reviewForm.rating
                              ? "text-lumina-attention"
                              : "text-lumina-border"
                          }
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    placeholder="Share your experience..."
                    value={reviewForm.comment}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        comment: e.target.value,
                      })
                    }
                    className="h-[120px] w-full resize-none border border-lumina-border bg-lumina-surface px-4 py-3 text-lumina-text outline-none transition focus:border-lumina-text-muted"
                  />

                  <button
                    onClick={handleSubmitReview}
                    className="rounded-full bg-lumina-black px-6 py-3 text-[14px] text-white"
                  >
                    Submit Review
                  </button>
                </div>
              </div>
)}
{!eligibleRequest && !hasReviewed && (
  <div className="mb-8 rounded-[24px] border border-lumina-border bg-lumina-surface-soft p-6 text-center">
    <p
      className="text-[22px] font-semibold"
      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
    >
      Reviews are unlocked after your appointment.
    </p>

    <p className="mt-3 text-[15px] leading-[1.6] text-lumina-text-muted">
      Once you've completed a service with this beauty professional,
      you'll be able to leave a verified review.
    </p>
  </div>
)}

{hasReviewed && (
  <div className="mb-8 rounded-[24px] border border-lumina-border bg-lumina-surface-soft p-6 text-center">
    <p
      className="text-[22px] font-semibold"
      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
    >
      {hasPendingReview ? "Your experience is on record" : "Thank you for your review ✨"}
    </p>

    <p className="mt-3 text-[15px] leading-[1.6] text-lumina-text-muted">
      {hasPendingReview
        ? "A professional exception was also reported, so your review is safely retained as pending until Lumina adds moderation. Neither side has been automatically accepted or erased."
        : "Your feedback has been submitted and will help future clients."}
    </p>
  </div>
)}
<div className="mb-8 rounded-[24px] border border-lumina-border bg-lumina-surface p-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-[13px] uppercase tracking-[0.14em] text-lumina-text-muted">
        Verified reviews
      </p>

      <div className="mt-2 flex items-center gap-3">
        <span className="text-[28px] text-lumina-attention">★</span>

        <span
          className="text-[42px] leading-none font-semibold"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          {reviews.length > 0 ? averageRating.toFixed(1) : "—"}
        </span>
      </div>
    </div>

    <div className="sm:text-right">
      <p className="text-[16px] font-medium">
        {reviews.length} verified{" "}
        {reviews.length === 1 ? "review" : "reviews"}
      </p>

      <p className="mt-1 max-w-[420px] text-[14px] leading-[1.5] text-lumina-text-muted">
        Only clients with a completed Lumina appointment can leave feedback.
      </p>
    </div>
  </div>
</div>
              <div className="mt-8 space-y-5">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-[20px] border border-lumina-border bg-lumina-surface-soft p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
  <div>
    <div className="flex flex-wrap items-center gap-2">
      <p className="font-medium">{review.reviewer_name}</p>

      <span className="rounded-full border border-lumina-border bg-lumina-surface px-2.5 py-1 text-[11px] font-medium text-lumina-text-muted">
        ✓ Verified client
      </span>
    </div>

    <p className="mt-2 text-lumina-attention">
      {"★".repeat(review.rating)}
      <span className="text-lumina-border">
        {"★".repeat(5 - review.rating)}
      </span>
    </p>

    <p className="mt-2 text-[12px] text-lumina-text-muted">
      {formatReviewDate(review.created_at)}
    </p>
  </div>

</div>

                      <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.6] text-lumina-text">
                        {review.comment}
                      </p>
                      {review.artist_response &&
  replyingToReviewId !== review.id && (
    <div className="mt-5 rounded-[18px] border border-lumina-border bg-lumina-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-lumina-text-muted">
          Response from the professional
        </p>

        {review.artist_response_at && (
          <p className="text-[12px] text-lumina-text-muted">
            {formatReviewDate(review.artist_response_at)}
          </p>
        )}
      </div>

      <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.7] text-lumina-text">
        {review.artist_response}
      </p>
    </div>
  )}

{user?.id === review.artist_id &&
  replyingToReviewId !== review.id && (
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={() => {
          setReplyingToReviewId(review.id);
          setArtistResponseDraft(review.artist_response || "");
        }}
        className="text-[13px] font-medium text-lumina-text-muted transition hover:text-lumina-black"
      >
        {review.artist_response ? "Edit response" : "Reply"}
      </button>

      {review.artist_response && (
        <button
          type="button"
          onClick={() => removeArtistResponse(review)}
          disabled={savingArtistResponse}
          className="text-[13px] text-lumina-text-muted transition hover:text-lumina-attention disabled:opacity-50"
        >
          Remove response
        </button>
      )}

      {reportedReviewIds.has(review.id) ? (
        <span className="text-[12px] text-lumina-text-muted">Reported</span>
      ) : (
        <button
          type="button"
          onClick={() => setReportingReview(review)}
          className="text-[13px] text-lumina-text-muted transition hover:text-lumina-black"
        >
          Report review
        </button>
      )}
    </div>
  )}

{user?.id === review.artist_id &&
  replyingToReviewId === review.id && (
    <div className="mt-5 rounded-[18px] border border-lumina-border bg-lumina-surface p-5">
      <label
        htmlFor={`artist-response-${review.id}`}
        className="text-[13px] font-medium text-lumina-text"
      >
        Public response
      </label>

      <textarea
        id={`artist-response-${review.id}`}
        value={artistResponseDraft}
        onChange={(event) =>
          setArtistResponseDraft(event.target.value)
        }
        maxLength={2000}
        rows={4}
        placeholder="Thank the client or respond thoughtfully to their feedback."
        className="mt-3 w-full resize-none rounded-[16px] border border-lumina-border bg-lumina-surface-soft px-4 py-3 text-[14px] leading-[1.6] text-lumina-text outline-none transition focus:border-lumina-text-muted"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-[12px] text-lumina-text-muted">
          {artistResponseDraft.length}/2000
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setReplyingToReviewId(null);
              setArtistResponseDraft("");
            }}
            disabled={savingArtistResponse}
            className="rounded-full border border-lumina-border px-4 py-2 text-[13px] transition hover:border-lumina-text-muted disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => saveArtistResponse(review)}
            disabled={
              savingArtistResponse ||
              !artistResponseDraft.trim()
            }
            className="rounded-full bg-lumina-black px-5 py-2 text-[13px] font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {savingArtistResponse ? "Saving..." : "Save response"}
          </button>
        </div>
      </div>
    </div>
  )}
                    </div>
                  ))
                ) : (
                  <p className="text-lumina-text-muted">
                    No reviews yet. Be the first to leave one.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
        </div>
      </section>

      {selectedPortfolioImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="relative w-full max-w-[980px]">
            <button
              onClick={() => setSelectedPortfolioImage(null)}
              className="absolute right-0 top-[-42px] text-[15px] text-white"
            >
              Close
            </button>

            {selectedPortfolioImage.entry_type === "before_after" &&
            selectedPortfolioImage.before_image_url ? (
              <div className="grid grid-cols-2 overflow-hidden rounded-[12px] bg-black">
                <div className="relative">
                  <img
                    src={selectedPortfolioImage.before_image_url}
                    alt="Before"
                    className="max-h-[76vh] w-full object-contain"
                  />
                  <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-[12px] text-black">
                    Before
                  </span>
                </div>
                <div className="relative">
                  <img
                    src={selectedPortfolioImage.image_url}
                    alt="After"
                    className="max-h-[76vh] w-full object-contain"
                  />
                  <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-[12px] text-black">
                    After
                  </span>
                </div>
              </div>
            ) : (
              <img
                src={selectedPortfolioImage.image_url}
                alt={selectedPortfolioImage.caption || "Finished work"}
                className="max-h-[82vh] w-full rounded-[12px] object-contain"
              />
            )}

            <div className="mt-4 text-white">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-white/60">
                <span>{selectedPortfolioImage.entry_type === "before_after" ? "Before & After" : "Finished work"}</span>
                {selectedPortfolioImage.service_name && <><span>•</span><span>{selectedPortfolioImage.service_name}</span></>}
              </div>
              {selectedPortfolioImage.caption && (
                <p className="mt-2 text-[15px]">{selectedPortfolioImage.caption}</p>
              )}
              {selectedPortfolioImage.result_date && (
                <p className="mt-2 text-[12px] text-white/60">
                  {new Date(`${selectedPortfolioImage.result_date}T00:00:00`).toLocaleDateString()}
                </p>
              )}
              <p className="mt-3 text-[11px] text-white/50">Added by professional</p>
            </div>
          </div>
        </div>
      )}
{toast && (
  <div className="fixed bottom-6 left-6 z-[100] animate-in fade-in slide-in-from-bottom-3 duration-300">
    <div className="flex items-center gap-3 rounded-2xl bg-lumina-black px-5 py-4 text-white shadow-2xl">
      <span className="text-lg">✓</span>

      <span className="text-[14px] font-medium">
        {toast}
      </span>
    </div>
  </div>
)}
      {openRequest && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-lumina-black/30 px-4 py-4 sm:items-center sm:py-6">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-[460px] overflow-y-auto rounded-[22px] border border-lumina-glass-border bg-lumina-surface/95 p-6 text-lumina-text shadow-xl backdrop-blur-[14px] sm:max-h-[calc(100dvh-3rem)]">
            <div className="flex items-center justify-between">
              <h2
                className="text-[26px] font-semibold"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Send Request
              </h2>

              <button
                onClick={() => setOpenRequest(false)}
                className="text-[20px] text-lumina-text-muted hover:text-lumina-black"
              >
                ×
              </button>
            </div>

            <p className="mt-2 text-[14px] leading-[1.5] text-lumina-text-muted">
              Discuss service details and availability with {artist.name}.
              Sending this request starts a conversation and does not confirm an
              appointment.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-[18px] border border-lumina-border bg-lumina-surface-soft px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[13px] font-medium text-lumina-text">
                    {accountImage ? (
                      <img
                        src={accountImage}
                        alt={accountName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      accountInitial
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-lumina-text-muted">
                      Sending as
                    </p>
                    <p className="truncate text-[14px] font-medium text-lumina-text">
                      {user ? accountName : "Sign in to send a request"}
                    </p>
                  </div>
                </div>
                {user && (
                  <Link
                    href="/account"
                    className="shrink-0 text-[12px] text-lumina-text-muted transition hover:text-lumina-black"
                  >
                    Edit profile
                  </Link>
                )}
              </div>

              <input
                type="text"
                placeholder="Phone, email, or Instagram"
                value={requestForm.client_contact}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    client_contact: e.target.value,
                  })
                }
                className="w-full border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition focus:border-lumina-text-muted"
              />

              {services.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
                      Your request
                    </p>
                    <button
                      type="button"
                      onClick={focusServiceBuilder}
                      className="text-[12px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4 transition hover:text-lumina-black"
                    >
                      {selectedServices.length > 0
                        ? "Add another service"
                        : "Add a service"}
                    </button>
                  </div>

                  {selectedServices.length > 0 ? (
                    <div className="mt-3 overflow-hidden rounded-[16px] border border-lumina-border bg-lumina-surface-soft">
                      {selectedServices.map((service, index) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleRequestedService(service.id)}
                          aria-label={`Remove ${service.service_name}`}
                          className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-lumina-surface ${
                            index > 0 ? "border-t border-lumina-border" : ""
                          }`}
                        >
                          <span className="min-w-0 text-[13px] font-medium text-lumina-text">
                            {service.service_name}
                          </span>
                          <span className="shrink-0 text-[12px] text-lumina-text-muted">
                            {typeof service.price === "number"
                              ? `$${service.price}`
                              : "Price by proposal"}{" "}
                            <span aria-hidden="true" className="ml-2 text-lumina-text-muted">
                              ×
                            </span>
                          </span>
                        </button>
                      ))}
                      {pricedSelectedServices.length > 0 && (
                        <div className="flex items-end justify-between gap-4 border-t border-lumina-border bg-lumina-surface px-4 py-3">
                          <div>
                            <p className="text-[11px] text-lumina-text-muted">
                              {pricedSelectedServices.length === selectedServices.length
                                ? "Estimated listed total"
                                : "Estimated total for priced services"}
                            </p>
                            {pricedSelectedServices.length !== selectedServices.length && (
                              <p className="mt-1 text-[10px] text-lumina-text-muted">
                                Some selected services require a price proposal.
                              </p>
                            )}
                          </div>
                          <p className="text-[20px] font-medium text-lumina-text">
                            ${estimatedListedTotal.toLocaleString("en-US")}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-[16px] border border-dashed border-lumina-border bg-lumina-surface-soft px-4 py-5 text-center">
                      <p className="text-[13px] text-lumina-text-muted">
                        Add at least one service to continue.
                      </p>
                    </div>
                  )}

                  <p className="mt-3 text-[11px] leading-[1.5] text-lumina-text-muted">
                    Listed prices are estimates. The professional may adjust the final total and appointment time in their proposal.
                  </p>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Service requested"
                  value={requestForm.service_requested}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      service_requested: e.target.value,
                    })
                  }
                  className="w-full border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition focus:border-lumina-text-muted"
                />
              )}

              <details className="rounded-[18px] border border-lumina-border bg-lumina-surface-soft">
                <summary className="cursor-pointer list-none px-4 py-4 text-[13px] font-medium text-lumina-text marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    <span>Consultation Snapshot</span>
                    <span className="text-[11px] font-normal text-lumina-text-muted">
                      Optional&nbsp;＋
                    </span>
                  </span>
                </summary>

                <div className="space-y-4 border-t border-lumina-border px-4 pb-5 pt-4">
                  <p className="text-[12px] leading-[1.55] text-lumina-text-muted">
                    Share a little context to help {artist.name} understand what
                    you want before preparing a proposal.
                  </p>

                  <label className="block">
                    <span className="mb-2 block text-[12px] text-lumina-text-muted">
                      What are you hoping to achieve?
                    </span>
                    <textarea
                      value={consultationDraft.goal}
                      maxLength={600}
                      onChange={(event) =>
                        updateConsultationDraft("goal", event.target.value)
                      }
                      placeholder="Describe the look or result you have in mind"
                      className="h-[92px] w-full resize-none rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition focus:border-lumina-text-muted"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[12px] text-lumina-text-muted">
                      Anything you want to avoid?{" "}
                      <span className="text-lumina-text-muted">(optional)</span>
                    </span>
                    <textarea
                      value={consultationDraft.avoid}
                      maxLength={500}
                      onChange={(event) =>
                        updateConsultationDraft("avoid", event.target.value)
                      }
                      placeholder="Colors, finishes, shapes, or outcomes you do not want"
                      className="h-[78px] w-full resize-none rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition focus:border-lumina-text-muted"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[12px] text-lumina-text-muted">
                        Maintenance preference{" "}
                        <span className="text-lumina-text-muted">(optional)</span>
                      </span>
                      <select
                        value={consultationDraft.maintenance}
                        onChange={(event) =>
                          updateConsultationDraft(
                            "maintenance",
                            event.target.value as ConsultationMaintenance | ""
                          )
                        }
                        className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition focus:border-lumina-text-muted"
                      >
                        <option value="">Select a preference</option>
                        <option value="low">Low maintenance</option>
                        <option value="moderate">Moderate</option>
                        <option value="open">Open to maintenance</option>
                        <option value="not_sure">Not sure</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[12px] text-lumina-text-muted">
                        Budget range{" "}
                        <span className="text-lumina-text-muted">(optional)</span>
                      </span>
                      <input
                        type="text"
                        value={consultationDraft.budget}
                        maxLength={100}
                        onChange={(event) =>
                          updateConsultationDraft("budget", event.target.value)
                        }
                        placeholder="For example, $60–$90"
                        className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition focus:border-lumina-text-muted"
                      />
                    </label>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[12px] text-lumina-text-muted">
                          Inspiration photos{" "}
                          <span className="text-lumina-text-muted">(optional)</span>
                        </p>
                        <p className="mt-1 text-[10px] text-lumina-text-muted">
                          Up to 5 JPEG, PNG, or WebP images · 10 MB each
                        </p>
                      </div>

                      {consultationImages.length < CONSULTATION_IMAGE_LIMIT && (
                        <label className="shrink-0 cursor-pointer rounded-full border border-lumina-border bg-lumina-surface px-4 py-2 text-[11px] text-lumina-text transition hover:border-lumina-text-muted">
                          Add photos
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              addConsultationImages(event.target.files);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {consultationImages.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {consultationImages.map((image, index) => (
                          <div key={image.id} className="relative">
                            <img
                              src={image.previewUrl}
                              alt={"Inspiration preview " + (index + 1)}
                              className="aspect-[4/3] w-full rounded-[12px] border border-lumina-border object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeConsultationImage(image.id)}
                              aria-label={"Remove inspiration image " + (index + 1)}
                              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-lumina-surface/90 text-[16px] text-lumina-text shadow-sm"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </details>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-[12px] text-lumina-text-muted">
                    Preferred date <span className="text-lumina-text-muted">(optional)</span>
                  </span>
                  <input
                    type="date"
                    value={requestForm.preferred_date}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        preferred_date: e.target.value,
                      })
                    }
                    className={`w-full border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted ${
                      requestForm.preferred_date
                        ? "text-lumina-text"
                        : "text-lumina-text-muted"
                    }`}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[12px] text-lumina-text-muted">
                    Preferred time <span className="text-lumina-text-muted">(optional)</span>
                  </span>
                  <input
                    type="time"
                    value={requestForm.preferred_time}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        preferred_time: e.target.value,
                      })
                    }
                    className={`w-full border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted ${
                      requestForm.preferred_time
                        ? "text-lumina-text"
                        : "text-lumina-text-muted"
                    }`}
                  />
                </label>
              </div>

              <p className="-mt-2 text-[12px] text-lumina-text-muted">
                Leave date or time blank if your schedule is flexible.
              </p>

              <textarea
                placeholder="Notes"
                value={requestForm.notes}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    notes: e.target.value,
                  })
                }
                className="h-[100px] w-full resize-none border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition focus:border-lumina-text-muted"
              />
            </div>

            <p className="mt-4 text-center text-[11px] leading-[1.5] text-lumina-text-muted">
              Sending a request does not book an appointment or charge you.
            </p>

            <button
              onClick={handleRequestSubmit}
              disabled={
                requestLoading ||
                (services.length > 0 && selectedServices.length === 0)
              }
              className="mt-5 w-full rounded-full bg-lumina-black px-6 py-3 text-[14px] text-white disabled:opacity-50"
            >
              {requestLoading ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>
      )}

      {isOwnProfile && mediaEditorMode && (
        <ProfessionalProfileMediaEditor
          artistId={artist.id}
          mode={mediaEditorMode}
          open
          onClose={() => setMediaEditorMode(null)}
          imageUrl={
            mediaEditorMode === "cover"
              ? artist.cover_image_url || null
              : artist.profile_image_url || null
          }
          fallbackImageUrl={
            mediaEditorMode === "cover"
              ? portfolioPhotos[0]?.image_url || artist.profile_image_url || null
              : null
          }
          coverStyle={mobileCoverStyle}
          coverPositionX={mobileCoverFraming.positionX}
          coverPositionY={mobileCoverFraming.positionY}
          coverScale={mobileCoverFraming.scale}
          onSaved={(result) =>
            setArtist((current) =>
              current
                ? {
                    ...current,
                    profile_image_url:
                      result.profileImageUrl || current.profile_image_url,
                    cover_image_url:
                      result.coverImageUrl !== undefined
                        ? result.coverImageUrl
                        : current.cover_image_url,
                    cover_style: result.coverStyle || current.cover_style,
                    cover_position_x:
                      result.coverPositionX ?? current.cover_position_x,
                    cover_position_y:
                      result.coverPositionY ?? current.cover_position_y,
                    cover_scale: result.coverScale ?? current.cover_scale,
                  }
                : current
            )
          }
        />
      )}

      {reportingReview && (
        <ReviewReportDialog
          reviewId={reportingReview.id}
          reviewerName={reportingReview.reviewer_name}
          onClose={() => setReportingReview(null)}
          onReported={(reviewId) => {
            setReportedReviewIds((current) => {
              const next = new Set(current);
              next.add(reviewId);
              return next;
            });
            setReportingReview(null);
            setToast("Review report submitted for Lumina moderation.");
          }}
        />
      )}
    </main>
  );
}
