"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ArtistProfile() {
  const artistId = "emma-l";

  const [saved, setSaved] = useState<string[]>([]);
  const [openBooking, setOpenBooking] = useState(false);
  const [activeTab, setActiveTab] = useState<"service" | "portfolio" | "reviews">("service");

  useEffect(() => {
    const stored = localStorage.getItem("savedArtists");
    if (stored) {
      setSaved(JSON.parse(stored));
    }
  }, []);

  const toggleSave = (id: string) => {
    let updated: string[] = [];

    if (saved.includes(id)) {
      updated = saved.filter((item) => item !== id);
    } else {
      updated = [...saved, id];
    }

    setSaved(updated);
    localStorage.setItem("savedArtists", JSON.stringify(updated));
  };

  const services = [
    {
      name: "Classic",
      price: "$80",
      desc1: "Natural",
      desc2: "One extension per lash",
      time: "90 min",
      top: true,
    },
    {
      name: "Hybrid",
      price: "$100",
      desc1: "Mix of classic + volume",
      desc2: "Soft, fuller texture",
      time: "105 min",
    },
    {
      name: "Volume",
      price: "$120",
      desc1: "Full, fluffy, dramatic look",
      desc2: "Multiple lashes per natural lash",
      time: "120 min",
    },
    {
      name: "Mega Volume",
      price: "$150",
      desc1: "Bold, dense, high-impact",
      desc2: "Best for full glam",
      time: "150 min",
    },
    {
      name: "2-Week Fill",
      price: "$50",
      desc1: "Maintain for light",
      desc2: "shedding",
      time: "60 min",
    },
    {
      name: "3-Week Fill",
      price: "$65",
      desc1: "Fuller refresh",
      desc2: "",
      time: "90 min",
    },
    {
      name: "Foreign Fill",
      price: "$75",
      desc1: "For work done by",
      desc2: "another artist",
      time: "30 min",
    },
    {
      name: "Lash Removal",
      price: "$20",
      desc1: "Safe removal of",
      desc2: "extensions",
      time: "30 min",
    },
    {
      name: "Lash Lift",
      price: "$70",
      desc1: "Natural curl without",
      desc2: "extensions",
      time: "60 min",
    },
    {
      name: "Lash Lift + Tint",
      price: "$85",
      desc1: "Curl + darker lashes",
      desc2: "",
      time: "75 min",
    },
  ];

  const portfolioImages = [
    "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
  ];

  const reviews = [
    {
      name: "Mia R",
      rating: "5.0",
      text: "Emma is so gentle and my lashes always last. Super clean work and really pretty mapping.",
    },
    {
      name: "Ava T",
      rating: "4.9",
      text: "I’ve rebooked with her three times already. She actually listens to what look you want.",
    },
    {
      name: "Nina C",
      rating: "5.0",
      text: "Best lash retention I’ve had. Her studio vibe is also really calming and professional.",
    },
  ];

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Top panel */}
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/browse" className="transition hover:opacity-70">
          ← Back
        </Link>

        <div className="font-medium">Lumina</div>

        <div className="w-[60px]" />
      </header>

      <section className="px-4 py-8 md:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[320px_1fr] md:gap-14 lg:grid-cols-[360px_1fr]">
          {/* Left */}
          <div>
            <div className="relative h-[360px] w-full bg-[#dddddd] md:h-[430px]">
              <button
                onClick={() => toggleSave(artistId)}
                className="absolute right-4 top-4 text-[19px] leading-none transition hover:scale-110"
              >
                <span className="text-[#e9a8a8]">
                  {saved.includes(artistId) ? "♥" : "♡"}
                </span>
              </button>
            </div>

            <div className="mt-6">
              <h2
                className="text-[24px] md:text-[28px]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Availability
              </h2>

              <div className="mt-4 flex flex-wrap gap-4 text-[15px] text-neutral-800 md:gap-6 md:text-[16px]">
                <span>Monday</span>
                <span>Tuesday</span>
                <span>Wednesday</span>
                <span>Thursday</span>
                <span>Friday</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => setOpenBooking(true)}
                  className="rounded-full border border-black px-5 py-2 text-[14px] transition hover:bg-black hover:text-white"
                >
                  Request booking
                </button>

                <button className="rounded-full border border-black px-5 py-2 text-[14px] transition hover:bg-black hover:text-white">
                  Ask question
                </button>
              </div>
            </div>
          </div>

          {/* Right */}
          <div>
            <h1
              className="text-[42px] leading-[1.0] font-semibold md:text-[56px] lg:text-[64px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Emma L
            </h1>

            <p
              className="mt-1 text-[24px] leading-[1.1] md:text-[30px] lg:text-[34px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Lash Artist
            </p>

            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-[15px] text-neutral-800 md:mt-8 md:gap-x-14 md:text-[18px]">
              <span>4.9 (127 reviews)</span>
              <span>10+ years experience</span>
              <span>Broken Arrow, OK</span>
            </div>

            <p
              className="mt-8 max-w-[780px] text-[18px] leading-[1.5] text-neutral-800 md:mt-10 md:text-[20px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Soft glam specialist known for natural, camera-ready finishes
            </p>

            <div className="mt-8 md:mt-10">
              <p className="text-[12px] uppercase tracking-[0.12em] text-neutral-300 md:text-[14px]">
                Trust Highlights
              </p>

              <div className="mt-4 space-y-2 text-[15px] text-neutral-800 md:text-[17px]">
                <p>✔ Verified reviews</p>
                <p>◔ Responds within 2 hours</p>
                <p>◉ 70% clients rebook</p>
                <p>▣ 120+ verified results</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <section className="mt-12 pb-16 md:pb-20">
          <div className="flex flex-wrap justify-center gap-4 text-[15px] md:gap-10 md:text-[17px]">
            <button
              onClick={() => setActiveTab("service")}
              className={
                activeTab === "service"
                  ? "rounded-full border border-[#d8b4b4] px-4 py-2 text-black md:px-5"
                  : "text-neutral-500"
              }
            >
              Service
            </button>

            <button
              onClick={() => setActiveTab("portfolio")}
              className={
                activeTab === "portfolio"
                  ? "rounded-full border border-[#d8b4b4] px-4 py-2 text-black md:px-5"
                  : "text-neutral-500"
              }
            >
              Portfolio
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              className={
                activeTab === "reviews"
                  ? "rounded-full border border-[#d8b4b4] px-4 py-2 text-black md:px-5"
                  : "text-neutral-500"
              }
            >
              Reviews
            </button>
          </div>

          {/* Service tab */}
          {activeTab === "service" && (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-x-10 lg:gap-y-12">
              {services.map((service) => (
                <div
                  key={service.name}
                  className="rounded-[18px] bg-[#f8f2f2] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3
                      className="text-[20px] font-semibold"
                      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                    >
                      {service.name}
                    </h3>

                    {service.top && (
                      <span className="text-[11px] text-neutral-500">
                        Top service
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[18px] font-medium">{service.price}</p>

                  <p className="mt-4 text-[14px] leading-[1.45] text-neutral-700">
                    {service.desc1}
                    {service.desc1 && service.desc2 && <br />}
                    {service.desc2}
                  </p>

                  <p className="mt-8 text-right text-[13px] text-neutral-600 md:mt-10">
                    ◔ {service.time}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Portfolio tab */}
          {activeTab === "portfolio" && (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-8">
              {portfolioImages.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Portfolio ${index + 1}`}
                  className="h-[240px] w-full object-cover md:h-[260px] lg:h-[280px]"
                />
              ))}
            </div>
          )}

          {/* Reviews tab */}
          {activeTab === "reviews" && (
            <div className="mx-auto mt-10 max-w-[900px] space-y-5 lg:mt-12 lg:space-y-6">
              {reviews.map((review, index) => (
                <div key={index} className="border border-neutral-200 p-5 md:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-[17px] font-medium md:text-[18px]">
                      {review.name}
                    </h3>
                    <span className="text-[14px] text-neutral-600 md:text-[15px]">
                      ⭐ {review.rating}
                    </span>
                  </div>

                  <p className="mt-3 text-[15px] leading-[1.6] text-neutral-700 md:text-[16px]">
                    {review.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      {/* Footer */}
      <footer className="mt-6 bg-[#f4f1f0] px-4 py-10 md:px-10 md:py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-16">
          <div>
            <h3
              className="text-[28px] font-semibold md:text-[30px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Lumina
            </h3>
            <p className="mt-5 max-w-[260px] text-[14px] leading-[1.5] text-neutral-700 md:mt-6 md:text-[15px]">
              Discover trusted beauty professionals and showcase your artistry
              without social media pressure.
            </p>
          </div>

          <div>
            <h4
              className="text-[17px] font-semibold md:text-[18px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              For Clients
            </h4>
            <div className="mt-4 space-y-1 text-[14px] text-neutral-700 md:mt-6 md:text-[15px]">
              <p>Find Professionals</p>
              <p>How It Works</p>
              <p>Reviews</p>
            </div>
          </div>

          <div>
            <h4
              className="text-[17px] font-semibold md:text-[18px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              For Artists
            </h4>
            <div className="mt-4 space-y-1 text-[14px] text-neutral-700 md:mt-6 md:text-[15px]">
              <p>Join Lumina</p>
              <p>Pricing</p>
              <p>Success Stories</p>
            </div>
          </div>

          <div>
            <h4
              className="text-[17px] font-semibold md:text-[18px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Company
            </h4>
            <div className="mt-4 space-y-1 text-[14px] text-neutral-700 md:mt-6 md:text-[15px]">
              <p>About</p>
              <p>Contact</p>
              <p>Privacy</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking popup */}
      {openBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[430px] bg-white p-5 shadow-xl md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-medium md:text-[22px]">
                Request Booking
              </h2>
              <button
                onClick={() => setOpenBooking(false)}
                className="text-neutral-400 transition hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Service (e.g. Hybrid set)"
                className="w-full border border-neutral-300 px-4 py-3 outline-none"
              />

              <input
                type="date"
                className="w-full border border-neutral-300 px-4 py-3 outline-none"
              />

              <input
                type="time"
                className="w-full border border-neutral-300 px-4 py-3 outline-none"
              />

              <textarea
                placeholder="Notes (optional)"
                className="h-[120px] w-full resize-none border border-neutral-300 px-4 py-3 outline-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setOpenBooking(false)}
                className="text-[14px] text-neutral-500 transition hover:text-black"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setOpenBooking(false);
                  alert("Request sent ✨");
                }}
                className="rounded-full bg-black px-5 py-2 text-[14px] text-white"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}