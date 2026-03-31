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
      name: "Lash lift",
      price: "$70",
      desc1: "Natural curl without",
      desc2: "extensions",
      time: "60 min",
    },
    {
      name: "Lash lift + Tint",
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
      <header className="flex items-center justify-between bg-[#faf6f5] px-10 py-6 text-[15px]">
        <Link href="/browse" className="transition hover:opacity-70">
          ← Back
        </Link>

        <div className="font-medium">Lumina</div>

        <div className="w-[60px]" />
      </header>

      <section className="px-10 py-8">
        <div className="grid grid-cols-[360px_1fr] gap-14">
          {/* Left */}
          <div>
            <div className="relative h-[430px] w-full bg-[#dddddd]">
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
                className="text-[28px]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Availability
              </h2>

              <div className="mt-4 flex flex-wrap gap-6 text-[16px] text-neutral-800">
                <span>Monday</span>
                <span>Tuesday</span>
                <span>Wednesday</span>
                <span>Thursday</span>
                <span>Friday</span>
              </div>

              <div className="mt-5">
                <button
                  onClick={() => setOpenBooking(true)}
                  className="rounded-full border border-black px-5 py-2 text-[14px] transition hover:bg-black hover:text-white"
                >
                  Request booking
                </button>
              </div>
            </div>
          </div>

          {/* Right */}
          <div>
            <h1
              className="text-[64px] leading-[1.0] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Emma L
            </h1>

            <p
              className="mt-1 text-[34px] leading-[1.1]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Lash Artist
            </p>

            <div className="mt-8 flex flex-wrap gap-x-14 gap-y-3 text-[18px] text-neutral-800">
              <span>4.9 (127 reviews)</span>
              <span>10+ years experience</span>
              <span>Broken Arrow, OK</span>
            </div>

            <p
              className="mt-10 max-w-[780px] text-[20px] leading-[1.5] text-neutral-800"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Soft glam specialist known for natural, camera-ready finishes
            </p>

            <div className="mt-10">
              <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-300">
                Trust Highlights
              </p>

              <div className="mt-4 space-y-2 text-[17px] text-neutral-800">
                <p>✔ Verified reviews</p>
                <p>◔ Responds within 2 hours</p>
                <p>◉ 70% clients rebook</p>
                <p>▣ 120+ verified results</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <section className="mt-12 pb-20">
          <div className="flex justify-center gap-10 text-[17px]">
            <button
              onClick={() => setActiveTab("service")}
              className={
                activeTab === "service"
                  ? "rounded-full border border-[#d8b4b4] px-5 py-2 text-black"
                  : "text-neutral-500"
              }
            >
              Service
            </button>

            <button
              onClick={() => setActiveTab("portfolio")}
              className={
                activeTab === "portfolio"
                  ? "rounded-full border border-[#d8b4b4] px-5 py-2 text-black"
                  : "text-neutral-500"
              }
            >
              Portfolio
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              className={
                activeTab === "reviews"
                  ? "rounded-full border border-[#d8b4b4] px-5 py-2 text-black"
                  : "text-neutral-500"
              }
            >
              Reviews
            </button>
          </div>

          {/* Service tab */}
          {activeTab === "service" && (
            <div className="mt-12 grid grid-cols-4 gap-x-10 gap-y-12">
              {services.map((service) => (
                <div
                  key={service.name}
                  className="rounded-[18px] bg-[#f8f2f2] p-5"
                >
                  <div className="flex items-start justify-between">
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

                  <p className="mt-10 text-right text-[13px] text-neutral-600">
                    ◔ {service.time}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Portfolio tab */}
          {activeTab === "portfolio" && (
            <div className="mt-12 grid grid-cols-3 gap-8">
              {portfolioImages.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Portfolio ${index + 1}`}
                  className="h-[280px] w-full object-cover"
                />
              ))}
            </div>
          )}

          {/* Reviews tab */}
          {activeTab === "reviews" && (
            <div className="mx-auto mt-12 max-w-[900px] space-y-6">
              {reviews.map((review, index) => (
                <div key={index} className="border border-neutral-200 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[18px] font-medium">{review.name}</h3>
                    <span className="text-[15px] text-neutral-600">
                      ⭐ {review.rating}
                    </span>
                  </div>

                  <p className="mt-3 text-[16px] leading-[1.6] text-neutral-700">
                    {review.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      {/* Footer */}
      <footer className="mt-6 bg-[#f4f1f0] px-10 py-12">
        <div className="grid grid-cols-4 gap-16">
          <div>
            <h3
              className="text-[30px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Lumina
            </h3>
            <p className="mt-6 max-w-[260px] text-[15px] leading-[1.5] text-neutral-700">
              Discover trusted beauty professionals and showcase your artistry
              without social media pressure.
            </p>
          </div>

          <div>
            <h4
              className="text-[18px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              For Clients
            </h4>
            <div className="mt-6 space-y-1 text-[15px] text-neutral-700">
              <p>Find Professionals</p>
              <p>How It Works</p>
              <p>Reviews</p>
            </div>
          </div>

          <div>
            <h4
              className="text-[18px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              For Artists
            </h4>
            <div className="mt-6 space-y-1 text-[15px] text-neutral-700">
              <p>Join Lumina</p>
              <p>Pricing</p>
              <p>Success Stories</p>
            </div>
          </div>

          <div>
            <h4
              className="text-[18px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Company
            </h4>
            <div className="mt-6 space-y-1 text-[15px] text-neutral-700">
              <p>About</p>
              <p>Contact</p>
              <p>Privacy</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking popup */}
      {openBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-[430px] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-medium">Request Booking</h2>
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