"use client";

import Link from "next/link";
import { BadgeCheck, MapPin, Sparkles } from "lucide-react";
import LuminaBrand from "@/components/LuminaBrand";

export default function JoinAsArtistPage() {
  return (
    <main className="min-h-screen bg-lumina-surface text-lumina-text">
      <header className="border-b border-lumina-border bg-lumina-bg-soft">
        <div className="grid h-[76px] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-3 sm:px-4 lg:px-5 xl:px-6">
        <Link href="/" aria-label="Lumina home" className="block w-[116px] justify-self-start sm:w-[132px]">
          <LuminaBrand variant="wordmark" priority className="h-auto w-full" />
        </Link>

        <div className="hidden justify-self-center text-[14px] md:block">Professional Accounts</div>

        <nav className="flex items-center justify-self-end gap-5 text-sm md:gap-7">
          <Link href="/browse" className="transition hover:text-lumina-attention">
            Browse
          </Link>

          <Link href="/login" className="rounded-full bg-lumina-black px-4 py-2.5 text-white transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2">
            Login
          </Link>
        </nav>
        </div>
      </header>

      <section className="px-4 py-10 md:px-10 md:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_520px] lg:gap-20">
          <div className="max-w-[680px]">
            <p className="text-[12px] uppercase tracking-[0.24em] text-lumina-attention">
              For beauty professionals
            </p>

            <h1
              className="mt-4 text-[40px] font-normal leading-[1.02] md:text-[60px] lg:text-[76px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Build your
              <br />
              beauty profile
              <br />
              on Lumina
            </h1>

            <p className="mt-6 max-w-[580px] text-[18px] leading-[1.65] text-lumina-text-muted md:text-[20px]">
              Create a professional account to manage your public profile,
              upload portfolio work, list services, and receive client requests.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/artist-signup"
                className="rounded-full bg-lumina-black px-7 py-3 text-center text-[15px] text-white transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
              >
                Create Professional Account
              </Link>

              <Link
                href="/login"
                className="rounded-full border border-lumina-border bg-lumina-surface px-7 py-3 text-center text-[15px] text-lumina-text transition-colors duration-200 hover:border-lumina-black hover:bg-lumina-black hover:text-white focus-visible:border-lumina-black focus-visible:bg-lumina-black focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
              >
                Professional Login
              </Link>
            </div>

            <p className="mt-4 text-[13px] text-lumina-text-muted">
              Looking for beauty services?{" "}
              <Link href="/signup" className="text-lumina-text underline">
                Create a client account
              </Link>
            </p>

            <div className="mt-12 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text-muted">
                  <Sparkles size={17} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <p className="pt-1.5 text-[15px] text-lumina-text-muted md:text-[16px]">
                  Edit your profile details, services, pricing, availability,
                  and contact info from your dashboard.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text-muted">
                  <BadgeCheck size={17} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <p className="pt-1.5 text-[15px] text-lumina-text-muted md:text-[16px]">
                  Build trust with portfolio work, availability, service
                  details, and reviews.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text-muted">
                  <MapPin size={17} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <p className="pt-1.5 text-[15px] text-lumina-text-muted md:text-[16px]">
                  Be searchable by service, city, category, and map location.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-lumina-glass-border bg-lumina-glass p-6 shadow-[0_18px_48px_rgba(39,36,40,0.06)] backdrop-blur-[12px] md:p-8">
            <p className="text-[12px] uppercase tracking-[0.22em] text-lumina-attention">
              How it works
            </p>

            <h2
              className="mt-3 text-[32px] font-normal md:text-[40px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Your dashboard controls your public profile.
            </h2>

            <div className="mt-8 space-y-6">
              <div>
                <p className="text-[16px] font-medium">
                  1. Create professional account
                </p>

                <p className="mt-2 text-[14px] leading-[1.6] text-lumina-text-muted">
                  Sign up as a beauty professional so Lumina can create your
                  artist profile and connect it to your dashboard.
                </p>
              </div>

              <div>
                <p className="text-[16px] font-medium">
                  2. Edit your public profile
                </p>

                <p className="mt-2 text-[14px] leading-[1.6] text-lumina-text-muted">
                  Add your bio, service category, location, pricing,
                  availability, contact details, and profile photo.
                </p>
              </div>

              <div>
                <p className="text-[16px] font-medium">3. Upload your work</p>

                <p className="mt-2 text-[14px] leading-[1.6] text-lumina-text-muted">
                  Add portfolio photos so clients can see your real results
                  before they send a request.
                </p>
              </div>

              <div>
                <p className="text-[16px] font-medium">4. Receive requests</p>

                <p className="mt-2 text-[14px] leading-[1.6] text-lumina-text-muted">
                  Clients can view your profile, save it, compare it, and send a
                  request when they are ready.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-[20px] border border-lumina-glass-border bg-lumina-surface/80 p-5">
              <p className="text-[13px] uppercase tracking-[0.12em] text-lumina-text-muted">
                Account types
              </p>

              <p className="mt-3 text-[15px] leading-[1.6] text-lumina-text-muted">
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
