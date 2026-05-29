"use client";

import Link from "next/link";

export default function JoinAsArtistPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/" className="font-medium transition hover:opacity-70">
          Lumina
        </Link>

        <div className="hidden md:block">Professional Accounts</div>

        <nav className="flex items-center gap-5 text-sm md:gap-8">
          <Link href="/browse" className="transition hover:opacity-70">
            Browse
          </Link>

          <Link href="/login" className="transition hover:opacity-70">
            Login
          </Link>
        </nav>
      </header>

      <section className="px-4 py-10 md:px-10 md:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_520px] lg:gap-20">
          <div className="max-w-[680px]">
            <p className="text-[12px] uppercase tracking-[0.15em] text-neutral-400">
              For beauty professionals
            </p>

            <h1
              className="mt-4 text-[40px] leading-[1.02] font-semibold md:text-[60px] lg:text-[76px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Build your
              <br />
              beauty profile
              <br />
              on Lumina
            </h1>

            <p
              className="mt-6 max-w-[580px] text-[18px] leading-[1.5] text-neutral-700 md:text-[22px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Create a professional account to manage your public profile,
              upload portfolio work, list services, and receive client requests.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/artist-signup"
                className="rounded-full bg-black px-7 py-3 text-center text-[15px] text-white transition hover:opacity-90"
              >
                Create Professional Account
              </Link>

              <Link
                href="/login"
                className="rounded-full border border-black px-7 py-3 text-center text-[15px] transition hover:bg-black hover:text-white"
              >
                Professional Login
              </Link>
            </div>

            <p className="mt-4 text-[13px] text-neutral-500">
              Looking for beauty services?{" "}
              <Link href="/signup" className="text-black underline">
                Create a client account
              </Link>
            </p>

            <div className="mt-12 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-[#e9a8a8]">✨</span>
                <p className="text-[15px] text-neutral-700 md:text-[16px]">
                  Edit your profile details, services, pricing, availability,
                  and contact info from your dashboard.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[#e9a8a8]">♡</span>
                <p className="text-[15px] text-neutral-700 md:text-[16px]">
                  Build trust with portfolio work, availability, service
                  details, and reviews.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[#e9a8a8]">📍</span>
                <p className="text-[15px] text-neutral-700 md:text-[16px]">
                  Be searchable by service, city, category, and map location.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-[#fbf7f6] p-6 md:p-8">
            <p className="text-[12px] uppercase tracking-[0.12em] text-neutral-400">
              How it works
            </p>

            <h2
              className="mt-3 text-[32px] font-semibold md:text-[40px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Your dashboard controls your public profile.
            </h2>

            <div className="mt-8 space-y-6">
              <div>
                <p className="text-[16px] font-medium">
                  1. Create professional account
                </p>

                <p className="mt-2 text-[14px] leading-[1.6] text-neutral-600">
                  Sign up as a beauty professional so Lumina can create your
                  artist profile and connect it to your dashboard.
                </p>
              </div>

              <div>
                <p className="text-[16px] font-medium">
                  2. Edit your public profile
                </p>

                <p className="mt-2 text-[14px] leading-[1.6] text-neutral-600">
                  Add your bio, service category, location, pricing,
                  availability, contact details, and profile photo.
                </p>
              </div>

              <div>
                <p className="text-[16px] font-medium">3. Upload your work</p>

                <p className="mt-2 text-[14px] leading-[1.6] text-neutral-600">
                  Add portfolio photos so clients can see your real results
                  before they send a request.
                </p>
              </div>

              <div>
                <p className="text-[16px] font-medium">4. Receive requests</p>

                <p className="mt-2 text-[14px] leading-[1.6] text-neutral-600">
                  Clients can view your profile, save it, compare it, and send a
                  request when they are ready.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-[20px] bg-white p-5">
              <p className="text-[13px] uppercase tracking-[0.12em] text-neutral-400">
                Account types
              </p>

              <p className="mt-3 text-[15px] leading-[1.6] text-neutral-700">
                Client accounts are for saving and comparing artists.
                Professional accounts are for managing a public beauty profile.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}