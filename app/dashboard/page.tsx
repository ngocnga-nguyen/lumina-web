"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Artist = {
  id: string;
  name: string;
  category: string;
  location: string;
  price_start: number;
  bio?: string | null;
  profile_image_url?: string | null;
  availability?: string | null;
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

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[#faf6f5]/95 px-4 py-4 text-[14px] backdrop-blur md:px-10 md:py-5 md:text-[15px]">
        <Link href="/dashboard" className="transition hover:opacity-70">
          ← Dashboard
        </Link>

        <Link href="/" className="font-medium transition hover:opacity-70">
          Lumina
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-full border border-black px-3 py-1 text-[13px] transition hover:bg-black hover:text-white"
          >
            Settings
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 z-40 w-[220px] rounded-[18px] border border-neutral-200 bg-white p-3 shadow-lg">
              <Link
                href="/dashboard/profile"
                className="block rounded-[12px] px-3 py-3 text-[14px] hover:bg-[#faf6f5]"
              >
                Edit Profile
              </Link>

              <Link
                href="/dashboard/services"
                className="block rounded-[12px] px-3 py-3 text-[14px] hover:bg-[#faf6f5]"
              >
                Add Services
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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr] lg:gap-12">
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
              className="max-w-[760px] text-[40px] leading-[1.0] font-semibold sm:text-[48px] md:text-[56px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist?.name || "Your Artist Profile"}
            </h1>

            <p
              className="mt-2 text-[28px] md:text-[34px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist?.category || "Service Category"}
            </p>

            <div className="mt-7 flex flex-col gap-3 text-[16px] sm:flex-row sm:flex-wrap sm:gap-x-12">
              <span>New profile</span>
              <span>From ${artist?.price_start || 0}</span>
              <span>{artist?.location || "Location"}</span>
            </div>

            <p
              className="mt-8 max-w-[760px] text-[18px] leading-[1.6]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist?.bio ||
                "Your bio preview will appear here after you update your profile."}
            </p>

            <div className="mt-8">
              <p className="text-[13px] uppercase tracking-[0.14em] text-neutral-400">
                Trust Highlights
              </p>

              <div className="mt-4 space-y-2 text-[15px] text-neutral-800">
                <p>✔ Profile listed on Lumina</p>
                <p>◔ Contact available through request form</p>
                <p>◉ Pricing shown upfront</p>
                <p>
                  {artist?.profile_image_url
                    ? "◌ Profile photo uploaded"
                    : "◌ Profile photo needed"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-12 md:mt-16">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-[15px]">
              <button className="rounded-full border border-[#e9a8a8] px-4 py-2 leading-none">
                Services
              </button>

              <Link
                href="/dashboard/portfolio"
                className="leading-none transition hover:opacity-60"
              >
                Portfolio
              </Link>

              <Link
                href="/dashboard/requests"
                className="leading-none transition hover:opacity-60"
              >
                Requests
              </Link>
            </div>

            <Link
              href="/dashboard/services"
              className="text-[13px] transition hover:opacity-60"
            >
              Add Services
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