"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SaveArtistButton from "@/components/SaveArtistButton";

type Artist = {
  id: string;
  name: string;
  category: string;
  location: string;
  price_start: number;
  bio?: string;
  profile_image_url?: string;
  social_link?: string;
  availability?: string;
  email?: string;

  is_verified?: boolean;
  years_experience?: number | null;
  experience_unit?: "new" | "months" | "years" | null;
  experience_amount?: number | null;
  verified_results_count?: number | null;
  repeat_client_rate?: number | null;
  verified_reviews?: boolean | null;
};

type PortfolioImage = {
  id: string;
  image_url: string;
  caption?: string;
};

type Service = {
  id: string;
  service_name: string;
  price: number | null;
  duration: string | null;
  description: string | null;
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
};

export default function ArtistProfile() {
  const params = useParams();
  const artistId = params.slug as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [selectedPortfolioImage, setSelectedPortfolioImage] =
    useState<PortfolioImage | null>(null);
    const [toast, setToast] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replyingToReviewId, setReplyingToReviewId] = useState<string | null>(
  null
);
const [artistResponseDraft, setArtistResponseDraft] = useState("");
const [savingArtistResponse, setSavingArtistResponse] = useState(false);

  const [eligibleRequest, setEligibleRequest] = useState<any>(null);
const [hasReviewed, setHasReviewed] = useState(false);
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
  const [activeTab, setActiveTab] = useState<
    "service" | "portfolio" | "reviews"
  >(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("tab") === "reviews"
      ? "reviews"
      : "service"
  );

  const [openRequest, setOpenRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const accountName =
  accountArtistProfile?.name ||
  clientProfile?.full_name ||
  user?.user_metadata?.full_name ||
  user?.email ||
  "User";

const accountInitial = accountName.charAt(0).toUpperCase();

const accountImage =
  accountArtistProfile?.profile_image_url ||
  clientProfile?.profile_image_url ||
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
      .select("full_name, profile_image_url")
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
      const { data: artistData, error: artistError } = await supabase
        .from("artists")
.select("*")
.eq("id", params.slug)
.eq("is_active", true)
.single();

      if (artistError) {
        console.log("Artist fetch error:", artistError);
        return;
      }

      setArtist(artistData);

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
        .order("created_at", { ascending: false });

      setReviews(reviewData || []);
      if (user?.id) {
  const { data: completedRequests, error: completedRequestsError } =
    await supabase
      .from("client_requests")
      .select("id, artist_id, client_id, booking_status, completed_at")
      .eq("artist_id", artistId)
      .eq("client_id", user.id)
      .eq("booking_status", "completed")
      .order("completed_at", { ascending: false });

  if (completedRequestsError) {
    console.log(completedRequestsError);
  }

  const reviewedRequestIds = new Set(
    (reviewData || [])
      .filter((review) => review.client_id === user.id)
      .map((review) => review.request_id)
  );

  const nextEligibleRequest =
    completedRequests?.find(
      (request) => !reviewedRequestIds.has(request.id)
    ) || null;

  setEligibleRequest(nextEligibleRequest);
  setHasReviewed(
    Boolean(completedRequests?.length) && !nextEligibleRequest
  );
} else {
  setEligibleRequest(null);
  setHasReviewed(false);
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
  }, [artistId, user?.id]);

  useEffect(() => {
    if (
      activeTab === "reviews" &&
      eligibleRequest &&
      window.location.hash === "#leave-review"
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
    const { data: insertedRequest, error } = await supabase
      .from("client_requests")
      .insert([
        {
        artist_id: artist.id,
        artist_name: artist.name,
        artist_image_url: artist.profile_image_url || null,
        artist_slug: artist.id,
        artist_category: artist.category || null,

        client_id: user.id,
        client_name: clientName,
        client_contact: requestForm.client_contact,
        service_requested: requestForm.service_requested,
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
          service: requestForm.service_requested,
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

  const { data, error } = await supabase
    .from("reviews")
    .update({
      artist_response: response,
    })
    .eq("id", review.id)
    .eq("artist_id", user.id)
    .select("*")
    .single();

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

  const { data, error } = await supabase
    .from("reviews")
    .update({
      artist_response: null,
    })
    .eq("id", review.id)
    .eq("artist_id", user.id)
    .select("*")
    .single();

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

    const { data, error } = await supabase
      .from("reviews")
      .insert([
        {
          artist_id: artist.id,
          client_id: user.id,
          request_id: eligibleRequest.id,
          reviewer_name: reviewerName,
          rating: reviewForm.rating,
          comment: reviewForm.comment.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
  if (error.code === "23505") {
    alert("You have already reviewed this appointment.");
    setEligibleRequest(null);
    setHasReviewed(true);
    return;
  }

  if (error.code === "42501") {
    alert(
      "This review could not be verified. Please make sure the appointment is completed and you are signed in with the correct account."
    );
    return;
  }

  alert("We couldn't submit your review. Please try again.");
  console.error("Review submission error:", error);
  return;
}

    const updatedReviews = [data, ...reviews];

setReviews(updatedReviews);
setEligibleRequest(null);
setHasReviewed(true);

const updatedAverage =
  updatedReviews.reduce(
    (total, review) => total + review.rating,
    0
  ) / updatedReviews.length;

setAverageRating(updatedAverage);

    setReviewForm({
      rating: 5,
      comment: "",
    });

    alert("Review submitted ✨");
  };

  const deleteReview = async (id: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setReviews(reviews.filter((review) => review.id !== id));
  };

  if (!artist) {
    return (
      <main className="min-h-screen bg-white px-4 py-10 text-black md:px-10">
        <Link href="/browse">← Back</Link>
        <p className="mt-8 text-neutral-600">Loading artist profile...</p>
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

  const professionalHighlights = [
  artist.is_verified && "✓ Verified Professional",



  experienceLabel,

  artist.verified_results_count &&
    `${artist.verified_results_count} Portfolio Results`,

  artist.verified_reviews &&
    "Verified Reviews",

  artist.repeat_client_rate &&
    `${artist.repeat_client_rate}% Repeat Client Rate`,
].filter(Boolean);

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/browse">← Back</Link>

        <Link href="/" className="font-medium transition hover:opacity-70">
          Lumina
        </Link>

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
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[13px] font-medium text-white">
            {accountInitial}
          </span>
        )}
      </button>

      {accountMenuOpen && (
        <div className="absolute right-0 top-12 z-50 w-[220px] rounded-[20px] border border-neutral-200 bg-white p-2 shadow-xl">
          <div className="mb-2 border-b border-neutral-100 pb-2">
            <p className="truncate px-3 pt-2 text-[14px] font-medium">
              {accountName}
            </p>
            <p className="truncate px-3 pb-2 text-[12px] text-neutral-500">
              {accountArtistProfile?.category || "Client account"}
            </p>
          </div>

          {accountArtistProfile ? (
            <>
              <Link
                href="/dashboard"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/profile"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                Edit Profile
              </Link>
              <Link
                href="/dashboard/settings"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                Settings &amp; Privacy
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/saved"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                Saved Artists
              </Link>
              <Link
                href="/my-requests"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                My Requests
              </Link>
              <Link
                href="/account"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                Account
              </Link>
            </>
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
      </header>

      <section className="px-4 py-8 md:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[320px_1fr] md:gap-14 lg:grid-cols-[360px_1fr]">
          <div>
            <div className="relative h-[360px] w-full overflow-hidden bg-[#eeeeee] md:h-[430px]">
              {artist.profile_image_url ? (
                <img
                  src={artist.profile_image_url}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-neutral-400">
                  <div>
                    <p className="text-[18px]">Profile Image</p>
                    <p className="mt-1 text-[13px]">Coming soon</p>
                  </div>
                </div>
              )}

              
            </div>

            <div className="mt-6 rounded-[22px] bg-[#faf6f5] p-5">
              <h2
                className="text-[24px]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Availability
              </h2>

              <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.6] text-neutral-700">
                {artist.availability || "Availability coming soon."}
              </p>

              {isOwnProfile ? (
                <Link
                  href="/dashboard/profile"
                  className="mt-5 inline-block rounded-full border border-black bg-transparent px-5 py-3 text-[13px] text-black transition hover:bg-black hover:text-white"
                >
                  Edit profile
                </Link>
              ) : !viewerIsArtist ? (
                <button
                  onClick={() => setOpenRequest(true)}
                  className="mt-5 rounded-full border border-black bg-transparent px-5 py-3 text-[13px] text-black transition hover:bg-black hover:text-white"
                >
                  Send Request
                </button>
              ) : null}
            </div>
          </div>

          <div>
  <div className="flex items-start justify-between gap-4">
    <h1
      className="text-[34px] leading-[1.0] font-semibold md:text-[42px]"
      style={{ fontFamily: "'Playfair Display', serif" }}
    >
      {artist.name}
    </h1>

    <SaveArtistButton
      artistId={artist.id}
      artistName={artist.name}
      viewerIsArtist={viewerIsArtist}
    />
</div>

            {isOwnProfile && (
              <p className="mt-3 inline-flex rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] font-medium text-neutral-600">
                This is your public profile
              </p>
            )}
              
            <p
              className="mt-2 text-[24px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist.category}
            </p>

<div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-[15px] text-neutral-600">
                <span>{artist.location}</span>
              <span>Starting at ${artist.price_start}</span>
            </div>

          <div className="mt-8 max-w-[760px] border-t border-[#eadfdb] pt-6">

    <h2
  className="text-[30px] font-semibold"
  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
>
  Profile Highlights
</h2>

<div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
  {artist.is_verified && (
    <div className="rounded-[18px] border border-neutral-200 p-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-[14px] text-white">
        ✓
      </div>

      <p className="mt-3 text-[16px] font-medium">
        Verified Professional
      </p>

      <p className="mt-1 text-[12px] leading-[1.4] text-neutral-500">
        Identity and professional profile reviewed by Lumina
      </p>
    </div>
  )}

  {experienceLabel && (
    <div className="rounded-[18px] border border-neutral-200 p-5">
      <p className="text-[24px] font-semibold">{artist.experience_unit === "new" ? "New" : artist.experience_amount || artist.years_experience}</p>

      <p className="mt-2 text-[15px] text-neutral-600">
        {artist.experience_unit === "new" ? "Artist" : artist.experience_unit === "months" ? "Months Experience" : "Years Experience"}
      </p>
    </div>
  )}

  {artist.verified_results_count != null &&
    artist.verified_results_count > 0 && (
      <div className="rounded-[18px] border border-neutral-200 p-5">
        <p className="text-[28px] font-semibold">
          {artist.verified_results_count}
        </p>

        <p className="mt-2 text-[15px] text-neutral-600">
          Verified Portfolio Results
        </p>
      </div>
    )}

  {artist.repeat_client_rate != null &&
    artist.repeat_client_rate > 0 && (
      <div className="rounded-[18px] border border-neutral-200 p-5">
        <p className="text-[28px] font-semibold">
          {artist.repeat_client_rate}%
        </p>

        <p className="mt-2 text-[15px] text-neutral-600">
          Repeat Client Rate
        </p>
      </div>
    )}

  {services.length > 0 && (
    <div className="rounded-[18px] border border-neutral-200 p-5">
      <p className="text-[28px] font-semibold">
        {services.length}
      </p>

      <p className="mt-2 text-[15px] text-neutral-600">
        {services.length === 1 ? "Service Listed" : "Services Listed"}
      </p>
    </div>
  )}

  {portfolioImages.length > 0 && (
    <div className="rounded-[18px] border border-neutral-200 p-5">
      <p className="text-[28px] font-semibold">
        {portfolioImages.length}
      </p>

      <p className="mt-2 text-[15px] text-neutral-600">
        Portfolio Results
      </p>
    </div>
  )}
</div>

<div className="mt-10">
  <h3
    className="text-[28px] font-semibold"
    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
  >
    About
  </h3>

  <p
    className="mt-4 text-[18px] leading-[1.7] text-neutral-700"
    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
  >
    {artist.bio ||
      `Professional ${artist.category.toLowerCase()} serving clients in ${artist.location}.`}
  </p>
</div>
            
            </div>
          </div>
      </div>

        <section className="mt-6 pb-16">
          <div className="flex justify-center gap-6 text-[16px]">
            {["service", "portfolio", "reviews"].map((tab) => (
              <button
                key={tab}
                onClick={() =>
                  setActiveTab(tab as "service" | "portfolio" | "reviews")
                }
                className={
                  activeTab === tab
                    ? "rounded-full border border-[#d8b4b4] px-5 py-2"
                    : "text-neutral-500"
                }
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "service" && (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
              {services.length > 0 ? (
                services.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-[18px] bg-[#f8f2f2] p-5"
                  >
                    <h3
                      className="text-[22px] font-semibold"
                      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                    >
                      {service.service_name}
                    </h3>

                    <p className="mt-2 text-[18px]">${service.price}</p>

                    <p className="mt-4 whitespace-pre-line text-[14px] leading-[1.6] text-neutral-700">
                      {service.description || "No description added."}
                    </p>

                    <p className="mt-8 text-right text-[13px] text-neutral-600">
                      ◔ {service.duration || "Varies"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500">Services coming soon.</p>
              )}
            </div>
          )}

          {activeTab === "portfolio" && (
            <div className="mx-auto mt-10 grid max-w-[1350px] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {portfolioImages.length > 0 ? (
                portfolioImages.map((image) => (
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
                      <p className="mt-2 text-[14px] text-neutral-600">
                        {image.caption}
                      </p>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-neutral-500">No portfolio uploaded yet.</p>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="mx-auto mt-10 max-w-[900px]">
              {eligibleRequest && !hasReviewed && (
              <div
                id="leave-review"
                className="rounded-[24px] border border-neutral-200 p-6"
              >
                <h3
                  className="text-[28px] font-semibold"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  Leave a review
                </h3>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[16px] bg-[#faf6f5] px-4 py-3">
                    <p className="text-[12px] uppercase tracking-[0.12em] text-neutral-400">
                      Reviewing as
                    </p>
                    <p className="mt-1 text-[14px] font-medium text-neutral-800">
                      {clientProfile?.full_name ||
                        user?.user_metadata?.full_name ||
                        user?.email}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-[14px] text-neutral-500">
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
                              ? "text-[#e9a8a8]"
                              : "text-neutral-300"
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
                    className="h-[120px] w-full resize-none border border-neutral-200 px-4 py-3 outline-none"
                  />

                  <button
                    onClick={handleSubmitReview}
                    className="rounded-full bg-black px-6 py-3 text-[14px] text-white"
                  >
                    Submit Review
                  </button>
                </div>
              </div>
)}
{!eligibleRequest && !hasReviewed && (
  <div className="mb-8 rounded-[24px] border border-neutral-200 bg-[#faf6f5] p-6 text-center">
    <p
      className="text-[22px] font-semibold"
      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
    >
      Reviews are unlocked after your appointment.
    </p>

    <p className="mt-3 text-[15px] leading-[1.6] text-neutral-600">
      Once you've completed a service with this beauty professional,
      you'll be able to leave a verified review.
    </p>
  </div>
)}

{hasReviewed && (
  <div className="mb-8 rounded-[24px] border border-neutral-200 bg-[#faf6f5] p-6 text-center">
    <p
      className="text-[22px] font-semibold"
      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
    >
      Thank you for your review ✨
    </p>

    <p className="mt-3 text-[15px] leading-[1.6] text-neutral-600">
      Your feedback has been submitted and will help future clients.
    </p>
  </div>
)}
<div className="mb-8 rounded-[24px] border border-neutral-200 bg-white p-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-[13px] uppercase tracking-[0.14em] text-neutral-400">
        Verified reviews
      </p>

      <div className="mt-2 flex items-center gap-3">
        <span className="text-[28px] text-[#e9a8a8]">★</span>

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

      <p className="mt-1 max-w-[420px] text-[14px] leading-[1.5] text-neutral-500">
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
                      className="rounded-[20px] bg-[#faf6f5] p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
  <div>
    <div className="flex flex-wrap items-center gap-2">
      <p className="font-medium">{review.reviewer_name}</p>

      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-600">
        ✓ Verified client
      </span>
    </div>

    <p className="mt-2 text-[#e9a8a8]">
      {"★".repeat(review.rating)}
      <span className="text-neutral-300">
        {"★".repeat(5 - review.rating)}
      </span>
    </p>

    <p className="mt-2 text-[12px] text-neutral-400">
      {formatReviewDate(review.created_at)}
    </p>
  </div>

  {user?.id === review.client_id && (
    <button
      onClick={() => deleteReview(review.id)}
      className="text-[13px] text-neutral-400 transition hover:text-black"
    >
      Delete
    </button>
  )}
</div>

                      <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.6] text-neutral-700">
                        {review.comment}
                      </p>
                      {review.artist_response &&
  replyingToReviewId !== review.id && (
    <div className="mt-5 rounded-[18px] border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-neutral-500">
          Response from the professional
        </p>

        {review.artist_response_at && (
          <p className="text-[12px] text-neutral-400">
            {formatReviewDate(review.artist_response_at)}
          </p>
        )}
      </div>

      <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.7] text-neutral-700">
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
        className="text-[13px] font-medium text-neutral-600 transition hover:text-black"
      >
        {review.artist_response ? "Edit response" : "Reply"}
      </button>

      {review.artist_response && (
        <button
          type="button"
          onClick={() => removeArtistResponse(review)}
          disabled={savingArtistResponse}
          className="text-[13px] text-neutral-400 transition hover:text-red-600 disabled:opacity-50"
        >
          Remove response
        </button>
      )}
    </div>
  )}

{user?.id === review.artist_id &&
  replyingToReviewId === review.id && (
    <div className="mt-5 rounded-[18px] border border-neutral-200 bg-white p-5">
      <label
        htmlFor={`artist-response-${review.id}`}
        className="text-[13px] font-medium text-neutral-700"
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
        className="mt-3 w-full resize-none rounded-[16px] border border-neutral-200 bg-[#fafafa] px-4 py-3 text-[14px] leading-[1.6] outline-none transition focus:border-neutral-400"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-[12px] text-neutral-400">
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
            className="rounded-full border border-neutral-200 px-4 py-2 text-[13px] transition hover:border-neutral-400 disabled:opacity-50"
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
            className="rounded-full bg-black px-5 py-2 text-[13px] font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
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
                  <p className="text-neutral-500">
                    No reviews yet. Be the first to leave one.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
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

            <img
              src={selectedPortfolioImage.image_url}
              alt={selectedPortfolioImage.caption || "Portfolio image"}
              className="max-h-[82vh] w-full rounded-[12px] object-contain"
            />

            {selectedPortfolioImage.caption && (
              <p className="mt-4 text-[15px] text-white">
                {selectedPortfolioImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
{toast && (
  <div className="fixed bottom-6 left-6 z-[100] animate-in fade-in slide-in-from-bottom-3 duration-300">
    <div className="flex items-center gap-3 rounded-2xl bg-black px-5 py-4 text-white shadow-2xl">
      <span className="text-lg">✓</span>

      <span className="text-[14px] font-medium">
        {toast}
      </span>
    </div>
  </div>
)}
      {openRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[460px] rounded-[22px] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2
                className="text-[26px] font-semibold"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Send Request
              </h2>

              <button
                onClick={() => setOpenRequest(false)}
                className="text-[20px] text-neutral-500 hover:text-black"
              >
                ×
              </button>
            </div>

            <p className="mt-2 text-[14px] text-neutral-600">
              Your request will be sent to {artist.name}.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-[18px] border border-neutral-200 bg-[#faf9f7] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-[13px] font-medium text-neutral-700">
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
                    <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-400">
                      Sending as
                    </p>
                    <p className="truncate text-[14px] font-medium text-neutral-800">
                      {user ? accountName : "Sign in to send a request"}
                    </p>
                  </div>
                </div>
                {user && (
                  <Link
                    href="/account"
                    className="shrink-0 text-[12px] text-neutral-500 transition hover:text-black"
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
                className="w-full border border-neutral-200 px-4 py-3 text-[14px] outline-none"
              />

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
                className="w-full border border-neutral-200 px-4 py-3 text-[14px] outline-none"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-[12px] text-neutral-500">
                    Preferred date <span className="text-neutral-400">(optional)</span>
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
                    className={`w-full border border-neutral-200 px-4 py-3 text-[14px] outline-none ${
                      requestForm.preferred_date
                        ? "text-black"
                        : "text-neutral-400"
                    }`}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[12px] text-neutral-500">
                    Preferred time <span className="text-neutral-400">(optional)</span>
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
                    className={`w-full border border-neutral-200 px-4 py-3 text-[14px] outline-none ${
                      requestForm.preferred_time
                        ? "text-black"
                        : "text-neutral-400"
                    }`}
                  />
                </label>
              </div>

              <p className="-mt-2 text-[12px] text-neutral-400">
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
                className="h-[100px] w-full resize-none border border-neutral-200 px-4 py-3 text-[14px] outline-none"
              />
            </div>

            <button
              onClick={handleRequestSubmit}
              disabled={requestLoading}
              className="mt-5 w-full rounded-full bg-black px-6 py-3 text-[14px] text-white disabled:opacity-50"
            >
              {requestLoading ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
