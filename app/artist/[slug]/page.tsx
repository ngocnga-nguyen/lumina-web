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
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
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
  const [user, setUser] = useState<any>(null);
const [clientProfile, setClientProfile] = useState<any>(null);
const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "service" | "portfolio" | "reviews"
  >("service");

  const [openRequest, setOpenRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const accountName =
  clientProfile?.full_name ||
  user?.user_metadata?.full_name ||
  user?.email ||
  "User";

const accountInitial = accountName.charAt(0).toUpperCase();

const accountImage =
  clientProfile?.profile_image_url ||
  user?.user_metadata?.avatar_url ||
  null;
  const [requestForm, setRequestForm] = useState({
    client_name: "",
    client_contact: "",
    service_requested: "",
    preferred_date: "",
    preferred_time: "",
    notes: "",
  });

  const [reviewForm, setReviewForm] = useState({
    reviewer_name: "",
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
    };

    if (artistId) fetchArtistData();
  }, [artistId]);

  const handleRequestSubmit = async () => {
    if (!artist) return;

    if (!requestForm.client_name || !requestForm.client_contact) {
      alert("Please enter your name and contact info.");
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
    const { error } = await supabase.from("client_requests").insert([
      {
        artist_id: artist.id,
        artist_name: artist.name,
        artist_image_url: artist.profile_image_url || null,
        artist_slug: artist.id,
        artist_category: artist.category || null,

        client_id: user.id,
        client_name: requestForm.client_name,
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
    ]);

    if (error) {
      setRequestLoading(false);
      alert(error.message);
      return;
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
          clientName: requestForm.client_name,
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
      client_name: "",
      client_contact: "",
      service_requested: "",
      preferred_date: "",
      preferred_time: "",
      notes: "",
    });

    alert("Request sent ✨");
  };

  const handleSubmitReview = async () => {
    if (!artist) return;

    if (!reviewForm.reviewer_name || !reviewForm.comment) {
      alert("Please add your name and review.");
      return;
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert([
        {
          artist_id: artist.id,
          reviewer_name: reviewForm.reviewer_name,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        },
      ])
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setReviews([data, ...reviews]);

    setReviewForm({
      reviewer_name: "",
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

  const professionalHighlights = [
  artist.is_verified && "✓ Verified Professional",



  artist.years_experience &&
    `${artist.years_experience} Years Experience`,

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
              Client account
            </p>
          </div>

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

              <button
                onClick={() => setOpenRequest(true)}
                className="mt-5 rounded-full border border-black bg-transparent px-5 py-3 text-[13px] text-black transition hover:bg-black hover:text-white"
              >
                Send Request
              </button>
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
/>
</div>
              
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

  {artist.years_experience != null && artist.years_experience > 0 && (
    <div className="rounded-[18px] border border-neutral-200 p-5">
      <p className="text-[28px] font-semibold">
        {artist.years_experience}
      </p>

      <p className="mt-2 text-[15px] text-neutral-600">
        Years Experience
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
              <div className="rounded-[24px] border border-neutral-200 p-6">
                <h3
                  className="text-[28px] font-semibold"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  Leave a review
                </h3>

                <div className="mt-6 space-y-4">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={reviewForm.reviewer_name}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        reviewer_name: e.target.value,
                      })
                    }
                    className="w-full border border-neutral-200 px-4 py-3 outline-none"
                  />

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

              <div className="mt-8 space-y-5">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-[20px] bg-[#faf6f5] p-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{review.reviewer_name}</p>

                          <p className="mt-1 text-[#e9a8a8]">
                            {"★".repeat(review.rating)}
                            <span className="text-neutral-300">
                              {"★".repeat(5 - review.rating)}
                            </span>
                          </p>
                        </div>

                        <button
                          onClick={() => deleteReview(review.id)}
                          className="text-[13px] text-neutral-400 hover:text-black"
                        >
                          Delete
                        </button>
                      </div>

                      <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.6] text-neutral-700">
                        {review.comment}
                      </p>
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
              <input
                type="text"
                placeholder="Your name"
                value={requestForm.client_name}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    client_name: e.target.value,
                  })
                }
                className="w-full border border-neutral-200 px-4 py-3 text-[14px] outline-none"
              />

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
                <input
                  type="date"
                  value={requestForm.preferred_date}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      preferred_date: e.target.value,
                    })
                  }
                  className="w-full border border-neutral-200 px-4 py-3 text-[14px] outline-none"
                />

                <input
                  type="time"
                  value={requestForm.preferred_time}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      preferred_time: e.target.value,
                    })
                  }
                  className="w-full border border-neutral-200 px-4 py-3 text-[14px] outline-none"
                />
              </div>

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