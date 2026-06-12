"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProfileForm = {
  name: string;
  category: string;
  address: string;
  latitude: string;
  longitude: string;
  price_start: string;
  phone: string;
  social_link: string;
  bio: string;
  availability: string;
  profile_image_url: string;
  years_experience: string;
};

export default function DashboardProfilePage() {
  const [loading, setLoading] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    category: "",
    address: "",
    latitude: "",
    longitude: "",
    price_start: "",
    phone: "",
    social_link: "",
    bio: "",
    availability: "",
    profile_image_url: "",
   years_experience: "", 
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.log(error);
        return;
      }

      if (data) {
        setForm({
          name: data.name || "",
          category: data.category || "",
          address: data.address || data.location || "",
          latitude: data.latitude?.toString() || "",
          longitude: data.longitude?.toString() || "",
          price_start: data.price_start?.toString() || "",
          phone: data.phone || "",
          social_link: data.social_link || "",
          bio: data.bio || "",
          availability: data.availability || "",
          profile_image_url: data.profile_image_url || "",
          years_experience: data.years_experience?.toString() || "",
        });

        setIsActive(data.is_active ?? true);

        if (data.latitude && data.longitude) {
          setLocationSaved(true);
        }
      }
    };

    fetchProfile();
  }, []);

  const getCoordinatesFromAddress = async (address: string) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token || !address.trim()) {
      return null;
    }

    const encodedAddress = encodeURIComponent(address);

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&limit=1`
    );

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const [longitude, latitude] = data.features[0].center;

    return {
      latitude,
      longitude,
    };
  };

  const updateVisibility = async (nextStatus: boolean) => {
    setVisibilityLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setVisibilityLoading(false);
      alert("You need to be logged in.");
      return;
    }

    const { error } = await supabase
      .from("artists")
      .update({
        is_active: nextStatus,
      })
      .eq("id", user.id);

    setVisibilityLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setIsActive(nextStatus);

    alert(nextStatus ? "Your profile is now visible." : "Your profile is now hidden.");
  };

  const saveProfile = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      alert("You need to be logged in.");
      return;
    }

    let finalLatitude = form.latitude ? Number(form.latitude) : null;
    let finalLongitude = form.longitude ? Number(form.longitude) : null;

    if (form.address.trim()) {
      const coordinates = await getCoordinatesFromAddress(form.address);

      if (coordinates) {
        finalLatitude = coordinates.latitude;
        finalLongitude = coordinates.longitude;
        setLocationSaved(true);

        setForm((current) => ({
          ...current,
          latitude: coordinates.latitude.toString(),
          longitude: coordinates.longitude.toString(),
        }));
      } else {
        setLocationSaved(false);
      }
    }

    const { error } = await supabase
      .from("artists")
      .update({
        name: form.name,
        category: form.category,
        location: form.address,
        address: form.address,
        latitude: finalLatitude,
        longitude: finalLongitude,
        price_start: Number(form.price_start),
        phone: form.phone,
        social_link: form.social_link,
        bio: form.bio,
        availability: form.availability,
        profile_image_url: form.profile_image_url,
        years_experience: form.years_experience

  ? Number(form.years_experience)

  : null,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Profile updated ✨");
  };

  const inputClass =
    "w-full rounded-[14px] border border-neutral-200 px-4 py-3 text-[15px] outline-none transition focus:border-black";

  const sectionTitleClass =
    "text-[13px] uppercase tracking-[0.14em] text-neutral-400";

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-5 py-5 text-[15px]">
        <Link href="/dashboard" className="transition hover:opacity-70">
          ← Dashboard
        </Link>

        <Link href="/" className="font-medium transition hover:opacity-70">
          Lumina
        </Link>

        <div className="w-[80px]" />
      </header>

      <section className="px-5 py-10 md:px-10">
        <h1
          className="text-[42px] leading-[1.02] font-semibold md:text-[58px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Edit profile
        </h1>

        <p className="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-neutral-600">
          Keep your profile clear, accurate, and easy for clients to understand.
        </p>

        <div className="mt-8 max-w-[780px] rounded-[24px] border border-neutral-200 bg-[#fbf7f6] p-5 md:p-6">
          <p className={sectionTitleClass}>Public visibility</p>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[18px] font-medium">
                {isActive ? "Your profile is visible" : "Your profile is hidden"}
              </p>

              <p className="mt-2 text-[14px] leading-[1.6] text-neutral-600">
                {isActive
                  ? "Clients can currently find your profile on Lumina."
                  : "Clients cannot find your profile in browse, search, or map while hidden."}
              </p>
            </div>

            {isActive ? (
              <button
                onClick={() => updateVisibility(false)}
                disabled={visibilityLoading}
                className="rounded-full border border-black px-5 py-3 text-[14px] transition hover:bg-black hover:text-white disabled:opacity-50"
              >
                {visibilityLoading ? "Updating..." : "Hide Profile"}
              </button>
            ) : (
              <button
                onClick={() => updateVisibility(true)}
                disabled={visibilityLoading}
                className="rounded-full bg-black px-5 py-3 text-[14px] text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {visibilityLoading ? "Updating..." : "Make Profile Visible"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-10 max-w-[780px] rounded-[28px] border border-neutral-200 bg-white p-6 md:p-8">
          <div className="space-y-9">
            <section>
              <p className={sectionTitleClass}>Basic info</p>

              <div className="mt-4 space-y-4">
                <input
                  type="text"
                  placeholder="Artist or business name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className={inputClass}
                />

                <input
                  type="text"
                  placeholder="Service category, example: Nail Technician"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className={inputClass}
                />

                <input
                  type="number"
                  placeholder="Starting price"
                  value={form.price_start}
                  onChange={(e) =>
                    setForm({ ...form, price_start: e.target.value })
                  }
                  className={inputClass}
                />

                <input
  type="number"
  placeholder="Years of experience, example: 5"
  value={form.years_experience}
  onChange={(e) =>
    setForm({ ...form, years_experience: e.target.value })
  }
  className={inputClass}
/>

              </div>
            </section>

            <section>
              <p className={sectionTitleClass}>Location</p>

              <div className="mt-4 space-y-4">
                <input
                  type="text"
                  placeholder="Salon address, example: 5315 S Mill St, Pryor, OK"
                  value={form.address}
                  onChange={(e) => {
                    setLocationSaved(false);
                    setForm({ ...form, address: e.target.value });
                  }}
                  className={inputClass}
                />

                <p className="text-[13px] leading-[1.5] text-neutral-500">
                  Your map pin will be created automatically from this address
                  when you save.
                </p>

                {locationSaved && (
                  <p className="inline-block rounded-full bg-[#faf6f5] px-4 py-2 text-[13px] text-neutral-700">
                    Map location saved
                  </p>
                )}
              </div>
            </section>

            <section>
              <p className={sectionTitleClass}>Contact</p>

              <div className="mt-4 space-y-4">
                <input
                  type="text"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  className={inputClass}
                />

                <input
                  type="text"
                  placeholder="Instagram, website, or booking link"
                  value={form.social_link}
                  onChange={(e) =>
                    setForm({ ...form, social_link: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
            </section>

            <section>
              <p className={sectionTitleClass}>Profile details</p>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-3 text-[14px] text-neutral-600">
                    Profile photo
                  </p>

                  <label className="flex h-[220px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-neutral-300 bg-[#fafafa] transition hover:bg-[#f5f5f5]">
                    {form.profile_image_url ? (
                      <img
                        src={form.profile_image_url}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-[16px] font-medium">
                          Upload profile photo
                        </p>

                        <p className="mt-2 text-[13px] text-neutral-500">
                          Tap to choose from phone or files
                        </p>
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];

                        if (!file) return;

                        const {
                          data: { user },
                        } = await supabase.auth.getUser();

                        if (!user) return;

                        const fileExt = file.name.split(".").pop();
                        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

                        const { error: uploadError } = await supabase.storage
                          .from("profile-images")
                          .upload(fileName, file);

                        if (uploadError) {
                          alert(uploadError.message);
                          return;
                        }

                        const { data } = supabase.storage
                          .from("profile-images")
                          .getPublicUrl(fileName);

                        setForm({
                          ...form,
                          profile_image_url: data.publicUrl,
                        });
                      }}
                    />
                  </label>
                </div>

                <textarea
                  placeholder="Short bio — describe your style, specialties, and what clients can expect."
                  value={form.bio}
                  onChange={(e) =>
                    setForm({ ...form, bio: e.target.value })
                  }
                  className="h-[130px] w-full resize-none rounded-[14px] border border-neutral-200 px-4 py-3 text-[15px] outline-none transition focus:border-black"
                />

                <textarea
                  placeholder="Availability, example: Monday–Friday, 9 AM–5 PM"
                  value={form.availability}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      availability: e.target.value,
                    })
                  }
                  className="h-[100px] w-full resize-none rounded-[14px] border border-neutral-200 px-4 py-3 text-[15px] outline-none transition focus:border-black"
                />
              </div>
            </section>

            <button
              onClick={saveProfile}
              disabled={loading}
              className="w-full rounded-full bg-black px-6 py-3 text-[15px] text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Saving changes..." : "Save changes"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}