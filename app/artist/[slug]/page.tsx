"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Artist = {
  id: string;
  name: string;
  category: string;
  location: string;
  price_start: number;
  bio?: string;
  profile_image_url?: string;
  social_link?: string;
  services_offered?: string;
  availability?: string;
  email?: string;
};

type PortfolioImage = {
  id: string;
  image_url: string;
  caption?: string;
};

export default function ArtistProfile() {
  const params = useParams();
  const artistId = params.slug as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [activeTab, setActiveTab] = useState<
    "service" | "portfolio" | "reviews"
  >("service");

  const [openRequest, setOpenRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  const [requestForm, setRequestForm] = useState({
    client_name: "",
    client_contact: "",
    service_requested: "",
    preferred_date: "",
    preferred_time: "",
    notes: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem("savedArtists");
    if (stored) setSaved(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const fetchArtist = async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", artistId)
        .single();

      if (error) {
        console.log("Artist fetch error:", error);
        return;
      }

      setArtist(data);
    };

    const fetchPortfolio = async () => {
      const { data, error } = await supabase
        .from("portfolio_images")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Portfolio fetch error:", error);
        return;
      }

      setPortfolioImages(data || []);
    };

    if (artistId) {
      fetchArtist();
      fetchPortfolio();
    }
  }, [artistId]);

  const toggleSave = (id: string) => {
    const updated = saved.includes(id)
      ? saved.filter((item) => item !== id)
      : [...saved, id];

    setSaved(updated);
    localStorage.setItem("savedArtists", JSON.stringify(updated));
  };

  const handleRequestSubmit = async () => {
    if (!artist) return;

    if (!requestForm.client_name || !requestForm.client_contact) {
      alert("Please enter your name and contact info.");
      return;
    }

    setRequestLoading(true);

    const { error } = await supabase.from("client_requests").insert([
      {
        artist_id: artist.id,
        client_name: requestForm.client_name,
        client_contact: requestForm.client_contact,
        service_requested: requestForm.service_requested,
        preferred_date: requestForm.preferred_date || null,
        preferred_time: requestForm.preferred_time,
        notes: requestForm.notes,
      },
    ]);

    if (error) {
      setRequestLoading(false);
      alert(error.message);
      return;
    }

    if (!artist.email) {
      console.log("No artist email saved. Request saved, but email not sent.");
      setRequestLoading(false);
      setOpenRequest(false);
      alert("Request saved, but this artist does not have an email saved yet.");
      return;
    }

    console.log("Sending request to API...");

    const res = await fetch("/api/send-request", {
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

    console.log("API response:", res);

    if (!res.ok) {
      const errorData = await res.json();
      console.log("Email API error:", errorData);
      setRequestLoading(false);
      alert(`Request saved, but email failed: ${errorData.error}`);
      return;
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

  if (!artist) {
    return (
      <main className="min-h-screen bg-white px-4 py-10 text-black md:px-10">
        <Link href="/browse">← Back</Link>
        <p className="mt-8 text-neutral-600">Loading artist profile...</p>
      </main>
    );
  }

  const services = [
    {
      name: artist.category,
      price: `From $${artist.price_start}`,
      desc1: artist.services_offered || "Services will be added soon.",
      desc2: artist.bio || "Details may vary by artist.",
      time: "Varies",
    },
  ];

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/browse">← Back</Link>
        <div className="font-medium">Lumina</div>
        <div className="w-[60px]" />
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

              <button
                onClick={() => toggleSave(artist.id)}
                className="absolute right-4 top-4 text-[19px]"
              >
                <span className="text-[#e9a8a8]">
                  {saved.includes(artist.id) ? "♥" : "♡"}
                </span>
              </button>
            </div>

            <div className="mt-6">
              <h2
                className="text-[24px]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Availability
              </h2>

              <p className="mt-4 text-[15px] leading-[1.6] text-neutral-700">
                {artist.availability || "Availability coming soon."}
              </p>

              <button
                onClick={() => setOpenRequest(true)}
                className="mt-6 rounded-full bg-black px-6 py-3 text-[14px] text-white transition hover:opacity-90"
              >
                Send Request
              </button>
            </div>
          </div>

          <div>
            <h1
              className="text-[42px] leading-[1.0] font-semibold md:text-[56px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist.name}
            </h1>

            <p
              className="mt-1 text-[28px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist.category}
            </p>

            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-[16px]">
              <span>{artist.location}</span>
              <span>From ${artist.price_start}</span>
            </div>

            <p
              className="mt-8 max-w-[760px] text-[20px] leading-[1.5]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist.bio || "This artist is building their Lumina profile."}
            </p>

            {artist.social_link && (
              <a
                href={
                  artist.social_link.startsWith("http")
                    ? artist.social_link
                    : `https://${artist.social_link}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block rounded-full border border-black px-5 py-2 text-[14px] transition hover:bg-black hover:text-white"
              >
                Visit social / website
              </a>
            )}

            <div className="mt-8 space-y-2 text-[16px]">
              <p>✔ Profile listed on Lumina</p>
              <p>◔ Contact available through request form</p>
              <p>◉ Pricing shown upfront</p>
              <p>
                ▣{" "}
                {portfolioImages.length > 0
                  ? "Portfolio images uploaded"
                  : "Portfolio coming soon"}
              </p>
            </div>
          </div>
        </div>

        <section className="mt-12 pb-16">
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
              {services.map((service) => (
                <div
                  key={service.name}
                  className="rounded-[18px] bg-[#f8f2f2] p-5"
                >
                  <h3
                    className="text-[22px] font-semibold"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    {service.name}
                  </h3>

                  <p className="mt-2 text-[18px]">{service.price}</p>

                  <p className="mt-4 whitespace-pre-line text-[14px] leading-[1.6] text-neutral-700">
                    {service.desc1}
                  </p>

                  <p className="mt-4 text-[14px] leading-[1.6] text-neutral-700">
                    {service.desc2}
                  </p>

                  <p className="mt-8 text-right text-[13px] text-neutral-600">
                    ◔ {service.time}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "portfolio" && (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {portfolioImages.length > 0 ? (
                portfolioImages.map((image) => (
                  <div key={image.id}>
                    <img
                      src={image.image_url}
                      alt="Portfolio"
                      className="h-[260px] w-full object-cover"
                    />
                    {image.caption && (
                      <p className="mt-2 text-[14px] text-neutral-600">
                        {image.caption}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-neutral-500">No portfolio uploaded yet.</p>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="mx-auto mt-10 max-w-[900px]">
              <div className="border border-neutral-200 p-5">
                <h3 className="text-[18px] font-medium">New profile</h3>
                <p className="mt-3 text-[15px] text-neutral-700">
                  Reviews will appear here once clients begin sharing feedback.
                </p>
              </div>
            </div>
          )}
        </section>
      </section>

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