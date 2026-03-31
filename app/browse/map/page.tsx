"use client";

import Link from "next/link";
import { useState } from "react";

export default function BrowseMapPage() {
  const [selectedPin, setSelectedPin] = useState<"emma" | "linsey" | "anna" | null>("emma");

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Top nav */}
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <div className="hidden md:block text-[15px]">Browse Artists</div>

        <Link href="/saved" className="flex items-center gap-2">
          <span className="text-[16px] text-[#e9a8a8]">♡</span>
          <span className="text-sm">Saved</span>
        </Link>
      </header>

      <section className="px-4 pt-8 pb-16 md:px-10 md:pt-10 md:pb-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/browse" className="text-[14px] md:text-[16px]">
              ← Back
            </Link>

            <h1
              className="mt-5 text-[32px] leading-[1.02] font-semibold md:mt-8 md:text-[54px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Professionals near me
            </h1>

            <p className="mt-2 text-[15px] text-neutral-700 md:mt-3 md:text-[18px]">
              Discover 4 talented beauty professionals
            </p>
          </div>

          <div className="w-full md:w-[580px]">
            <div className="flex items-center rounded-full bg-[#efedeb] px-4 py-3 md:px-5">
              <span className="mr-3 text-lg text-neutral-500">⌕</span>
              <input
                type="text"
                placeholder="search professional near me"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-start gap-4 text-[14px] text-neutral-700 md:mt-8 md:justify-center md:gap-8 md:text-[15px]">
              <button>All</button>
              <button>Nail</button>
              <button>Hair</button>
              <button>Aesthetician</button>
              <button>Lashes</button>
            </div>
          </div>

          <div className="hidden md:block text-[16px]">Map</div>
        </div>

        <div className="mt-10 md:mt-14">
          <div
            onClick={() => setSelectedPin(null)}
            className="relative h-[430px] w-full overflow-hidden bg-[#f1ece8] md:h-[620px]"
          >
            {/* Real map background */}
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/51/US_60_%28Oklahoma%29_map.png"
              alt="Oklahoma map"
              className="h-full w-full object-cover"
            />

            {/* Pins */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPin("emma");
              }}
              className="absolute left-[58%] top-[42%] text-[22px] text-[#e9a8a8] drop-shadow-md transition hover:scale-110 md:text-[28px]"
            >
              📍
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPin("linsey");
              }}
              className="absolute left-[48%] top-[48%] text-[22px] text-[#e9a8a8] drop-shadow-md transition hover:scale-110 md:text-[28px]"
            >
              📍
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPin("anna");
              }}
              className="absolute left-[52%] top-[56%] text-[22px] text-[#e9a8a8] drop-shadow-md transition hover:scale-110 md:text-[28px]"
            >
              📍
            </button>

            {/* Popup card */}
            {selectedPin === "emma" && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-4 left-4 w-[250px] bg-white p-4 shadow-lg md:bottom-auto md:left-[62%] md:top-[34%] md:w-[270px]"
              >
                <h3 className="text-[20px] font-medium md:text-[22px]">Emma L</h3>
                <p className="text-[14px] text-neutral-500 md:text-[15px]">Lash Artist</p>

                <p className="mt-3 text-[13px] text-neutral-600 md:text-[14px]">
                  4.9 (127 reviews) &nbsp;&nbsp; 10+ years experience
                </p>

                <p className="mt-4 text-[13px] text-neutral-700 md:text-[14px]">
                  Soft glam specialist known for natural, camera-ready finishes
                </p>
              </div>
            )}

            {selectedPin === "linsey" && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-4 left-4 w-[250px] bg-white p-4 shadow-lg md:bottom-auto md:left-[50%] md:top-[40%] md:w-[270px]"
              >
                <h3 className="text-[20px] font-medium md:text-[22px]">Linsey J</h3>
                <p className="text-[14px] text-neutral-500 md:text-[15px]">Hair Stylist</p>

                <p className="mt-3 text-[13px] text-neutral-600 md:text-[14px]">
                  4.6 (55 reviews) &nbsp;&nbsp; 8+ years experience
                </p>

                <p className="mt-4 text-[13px] text-neutral-700 md:text-[14px]">
                  Known for soft layers, movement, and polished styling.
                </p>
              </div>
            )}

            {selectedPin === "anna" && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-4 left-4 w-[250px] bg-white p-4 shadow-lg md:bottom-auto md:left-[54%] md:top-[50%] md:w-[270px]"
              >
                <h3 className="text-[20px] font-medium md:text-[22px]">Anna H</h3>
                <p className="text-[14px] text-neutral-500 md:text-[15px]">Nail Technician</p>

                <p className="mt-3 text-[13px] text-neutral-600 md:text-[14px]">
                  4.8 (45 reviews) &nbsp;&nbsp; 6+ years experience
                </p>

                <p className="mt-4 text-[13px] text-neutral-700 md:text-[14px]">
                  Clean sets, detailed shaping, and modern neutral nail design.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}