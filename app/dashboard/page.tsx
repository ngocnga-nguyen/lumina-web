"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CircleUser } from "lucide-react";

type Artist = {
  id: string;
  name: string;
  category: string;
  location: string;
  price_start: number;
  bio?: string | null;
  profile_image_url?: string | null;
  availability?: string | null;
  is_verified?: boolean;
  years_experience?: number | null;
};

type Service = {
  id: string;
  service_name: string;
  price: number | null;
  duration: string | null;
  description: string | null;
};

export default function DashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [artist, setArtist] = useState<Artist | null>(null);
  const accountName = artist?.name || "Artist";
const accountInitial = accountName.charAt(0).toUpperCase();
const accountImage = artist?.profile_image_url || null;
  const [services, setServices] = useState<Service[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const uploadProfileImage = async (file: File) => {
    if (!artist) return;

    setUploadingImage(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploadingImage(false);
      alert("You need to be logged in.");
      return;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(fileName, file);

    if (uploadError) {
      setUploadingImage(false);
      alert(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(fileName);

    const imageUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from("artists")
      .update({ profile_image_url: imageUrl })
      .eq("id", artist.id);

    setUploadingImage(false);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    setArtist({
      ...artist,
      profile_image_url: imageUrl,
    });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: artistData, error: artistError } = await supabase
        .from("artists")
        .select("*")
        .eq("id", user.id)
        .single();

      if (artistError || !artistData) {
        console.log(artistError);
        return;
      }

      setArtist(artistData);

      const { data: serviceData, error: serviceError } = await supabase
        .from("services")
        .select("*")
        .eq("artist_id", artistData.id)
        .order("created_at", { ascending: false });

      if (serviceError) {
        console.log(serviceError);
        return;
      }

      setServices(serviceData || []);
    };

    fetchDashboardData();
  }, []);

const professionalHighlights = [
  artist?.is_verified && "Verified Professional",

  artist?.years_experience &&
    `${artist.years_experience}+ Years Experience`,

  services.length > 0 &&
    `${services.length} Service${services.length > 1 ? "s" : ""} Listed`,

  artist?.profile_image_url && "Professional Portfolio",

].filter(Boolean);

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-30 grid grid-cols-3 items-center bg-[#faf6f5]/95 px-4 py-4 text-[14px] backdrop-blur md:px-10 md:py-5 md:text-[15px]">
      
        <Link href="/" className="justify-self-start text-sm transition hover:opacity-70">
          ← Home
        </Link>

        <Link href="/" className="justify-self-center font-medium transition hover:opacity-70">
          Lumina
        </Link>

        <div className="relative justify-self-end">
          <button
  onClick={() => setMenuOpen(!menuOpen)}
  className="flex h-10 w-10 items-center justify-center transition hover:opacity-70"
>
  {accountImage ? (
    <img
      src={accountImage}
      alt={accountName}
      className="h-9 w-9 rounded-full object-cover"
    />
  ) : (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-medium text-white">
      {accountInitial}
    </span>
  )}
</button>

          {menuOpen && (
            <div className="absolute right-0 top-9 z-40 w-[220px] rounded-[18px] border border-neutral-200 bg-white p-3 shadow-lg">
              <div className="mb-3 border-b border-neutral-100 pb-3">
  <div className="flex min-w-0 items-center gap-3">
    {accountImage ? (
      <img
        src={accountImage}
        alt={accountName}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    ) : (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-medium text-white">
        {accountInitial}
      </div>
    )}

    <div className="min-w-0">
      <p className="truncate text-[14px] font-medium">
  {accountName}
</p>
      <p className="text-[12px] text-neutral-500">
        {artist?.category}
      </p>
    </div>
  </div>
</div>
              <Link
                href="/dashboard/profile#availability"
                className="block rounded-[12px] px-3 py-3 text-[14px] hover:bg-[#faf6f5]"
              >
                Edit Profile
              </Link>

              <Link
                href="/dashboard/services"
                className="block rounded-[12px] px-3 py-3 text-[14px] hover:bg-[#faf6f5]"
              >
                Manage Services
              </Link>

              <Link
                href="/dashboard/portfolio"
                className="block rounded-[12px] px-3 py-3 text-[14px] hover:bg-[#faf6f5]"
              >
                Upload Portfolio
              </Link>

              <Link
                href="/dashboard/requests"
                className="block rounded-[12px] px-3 py-3 text-[14px] hover:bg-[#faf6f5]"
              >
                Manage Requests
              </Link>

              <div className="my-1 border-t border-neutral-100" />

              <Link
                href="/dashboard/settings"
                className="block rounded-[12px] px-3 py-3 text-[14px] hover:bg-[#faf6f5]"
              >
                Settings &amp; Privacy
              </Link>

              <button
                onClick={handleSignOut}
                className="block w-full rounded-[12px] px-3 py-3 text-left text-[14px] text-red-500 hover:bg-[#faf6f5]"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="px-4 py-6 md:px-10 md:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,820px)] lg:gap-9">
          <div>
            <label className="relative block h-[320px] cursor-pointer overflow-hidden rounded-[22px] bg-[#d9d9d9] transition hover:opacity-90 sm:h-[380px] lg:h-[420px]">
              {artist?.profile_image_url ? (
                <img
                  src={artist.profile_image_url}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-center text-neutral-400">
                  <div>
                    <p>Profile Image</p>
                    <p className="mt-2 text-[13px]">Tap to upload</p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-4 rounded-full bg-white/85 px-4 py-2 text-[13px] shadow-sm">
                {uploadingImage ? "Uploading..." : "Change photo"}
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadProfileImage(file);
                }}
              />
            </label>

            <div className="mt-6 rounded-[22px] bg-[#faf6f5] p-5">
              <h2
                className="text-[25px] md:text-[28px]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Availability
              </h2>

              <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.6] text-neutral-700">
                {artist?.availability || "Availability coming soon."}
              </p>

              <Link
                href="/dashboard/profile"
                className="mt-5 inline-block rounded-full border border-black px-5 py-2 text-[13px] transition hover:bg-black hover:text-white"
              >
                Edit availability
              </Link>
            </div>
          </div>

          <div>
            <h1
  className="text-[34px] leading-[1.0] font-semibold md:text-[42px]"
  style={{ fontFamily: "'Playfair Display', serif" }}
>
  {artist?.name || "Your Artist Profile"}
</h1>

            <p
              className="mt-3 text-[22px] font-normal text-neutral-800"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist?.category || "Service Category"}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-[16px] text-neutral-700">
              <span>
  {artist?.is_verified ? "Verified Professional" : "Professional Profile"}
</span>
              <span>From ${artist?.price_start || 0}</span>
              <span>{artist?.location || "Location"}</span>
            </div>

            <p
              className="mt-7 max-w-[760px] text-[18px] leading-[1.6]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist?.bio ||
                "Your bio preview will appear here after you update your profile."}
            </p>

            <div className="mt-10">
  <p className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-neutral-400 uppercase">
    Professional Highlights
  </p>

  <div className="mt-3 flex flex-wrap items-center text-[14px] text-neutral-600">
    {professionalHighlights.map((item, index) => (
      <span key={index} className="flex items-center">
  {index !== 0 && (
    <span className="mx-2 text-neutral-300">•</span>
  )}

  <span>{item}</span>
</span>
    ))}
  </div>
</div>
          </div>
        </div>

        <section className="mt-12 md:mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <nav
              aria-label="Dashboard sections"
              className="grid grid-cols-3 gap-2 text-center text-[14px] sm:flex sm:items-center sm:gap-3 sm:text-[15px]"
            >
              <span className="rounded-full bg-black px-3 py-2.5 leading-none text-white sm:px-4 sm:py-2">
                Services
              </span>

              <Link
                href="/dashboard/portfolio"
                className="rounded-full px-3 py-2.5 leading-none text-neutral-600 transition hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white active:bg-black active:text-white sm:px-4 sm:py-2"
              >
                Portfolio
              </Link>

              <Link
                href="/dashboard/requests"
                className="rounded-full px-3 py-2.5 leading-none text-neutral-600 transition hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white active:bg-black active:text-white sm:px-4 sm:py-2"
              >
                Requests
              </Link>
            </nav>

            <Link
              href="/dashboard/services"
              className="inline-flex w-fit items-center rounded-full border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-200 hover:text-black active:bg-neutral-300 sm:py-2"
            >
              Manage Services
            </Link>
          </div>

          {services.length === 0 ? (
            <div className="mt-8 rounded-[20px] bg-[#fbf4f4] p-5 text-[14px] text-neutral-600">
              No services yet. Add your first service so clients can see what
              you offer.
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="min-h-[190px] rounded-[20px] bg-[#fbf4f4] p-5"
                >
                  <h3
                    className="text-[24px] font-semibold"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    {service.service_name}
                  </h3>

                  <p className="mt-2">${service.price}</p>

                  <p className="mt-5 whitespace-pre-line text-[14px] leading-[1.5]">
                    {service.description || "No description added."}
                  </p>

                  <p className="mt-8 text-right text-[13px] text-neutral-500">
                    ◔ {service.duration || "duration"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
