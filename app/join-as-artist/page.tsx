"use client";

import Link from "next/link";
import { useState } from "react";

export default function JoinAsArtistPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Top nav */}
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <div className="hidden md:block">Join as Artist</div>

        <Link href="/browse" className="text-sm transition hover:opacity-70">
          Browse
        </Link>
      </header>

      {!submitted ? (
        <section className="px-4 py-10 md:px-10 md:py-14">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_520px] lg:gap-20">
            {/* Left side */}
            <div className="max-w-[640px]">
              <p className="text-[12px] uppercase tracking-[0.15em] text-neutral-400">
                Early access
              </p>

              <h1
                className="mt-4 text-[38px] leading-[1.02] font-semibold md:text-[56px] lg:text-[68px]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Join Lumina
                <br />
                as an Artist
              </h1>

              <p
                className="mt-6 max-w-[560px] text-[18px] leading-[1.5] text-neutral-700 md:text-[22px]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Get discovered by local clients and showcase your work in a space
                designed for trust, visibility, and pre-booking confidence.
              </p>

              <div className="mt-10 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-[#e9a8a8]">✨</span>
                  <p className="text-[15px] text-neutral-700 md:text-[16px]">
                    Get discovered by new local clients
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#e9a8a8]">♡</span>
                  <p className="text-[15px] text-neutral-700 md:text-[16px]">
                    Build trust before a client ever books
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#e9a8a8]">📍</span>
                  <p className="text-[15px] text-neutral-700 md:text-[16px]">
                    Be seen by people searching near you
                  </p>
                </div>
              </div>

              <div className="mt-10 rounded-[18px] bg-[#f8f2f2] p-5 md:p-6">
                <p className="text-[13px] uppercase tracking-[0.12em] text-neutral-400">
                  Why join early
                </p>
                <p className="mt-3 text-[15px] leading-[1.6] text-neutral-700 md:text-[16px]">
                  Early artists help shape the platform and get first access to
                  profile visibility as Lumina grows.
                </p>
              </div>
            </div>

            {/* Right side form */}
            <div className="rounded-[22px] bg-[#fbf7f6] p-5 md:p-8">
              <div className="mb-6">
                <p className="text-[12px] uppercase tracking-[0.12em] text-neutral-400">
                  Limited profile spots
                </p>
                <h2
                  className="mt-3 text-[30px] font-semibold md:text-[36px]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  Get early access
                </h2>
                <p className="mt-2 text-[14px] text-neutral-600 md:text-[15px]">
                  Create a simple profile and we’ll reach out when your listing is
                  ready.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="Studio or brand name"
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Service Type
                  </label>
                  <select
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a service
                    </option>
                    <option>Lash Artist</option>
                    <option>Nail Technician</option>
                    <option>Hair Stylist</option>
                    <option>Aesthetician</option>
                    <option>Makeup Artist</option>
                    <option>Brow Artist</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, State"
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Starting Price
                  </label>
                  <input
                    type="text"
                    placeholder="Example: From $85"
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Services Offered
                  </label>
                  <input
                    type="text"
                    placeholder="Example: Classic sets, Hybrid sets, Lash lift"
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    placeholder="@yourhandle"
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Portfolio Photos
                  </label>
                  <div className="border border-dashed border-neutral-300 bg-white px-4 py-6 text-center text-[14px] text-neutral-500">
                    Upload 2–5 photos
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-4 w-full rounded-full bg-black px-6 py-3 text-[15px] text-white transition hover:opacity-90"
                >
                  Join Lumina
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex min-h-[70vh] items-center justify-center px-4 py-16">
          <div className="w-full max-w-[520px] rounded-[24px] bg-[#fbf7f6] p-8 text-center md:p-10">
            <p className="text-[28px] text-[#e9a8a8]">✨</p>
            <h1
              className="mt-4 text-[34px] font-semibold md:text-[42px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              You’re in
            </h1>
            <p className="mt-4 text-[15px] leading-[1.6] text-neutral-700 md:text-[16px]">
              Thanks for joining early access. We’ll reach out when your profile
              is ready to go live on Lumina.
            </p>

            <div className="mt-8">
              <Link
                href="/"
                className="rounded-full border border-black px-6 py-3 text-[15px] transition hover:bg-black hover:text-white"
              >
                Back to home
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}