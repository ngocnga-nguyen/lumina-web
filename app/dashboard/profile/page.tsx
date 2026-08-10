"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AccountMenu from "@/components/AccountMenu";

type ProfileForm = {
  name: string;
  business_name: string;
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    business_name: "",
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
        const savedName = data.name || "";
        const businessMatch = savedName.match(/^(.*?)\s*\((.+)\)\s*$/);

        setForm({
          name: businessMatch?.[1]?.trim() || savedName,
          business_name: businessMatch?.[2]?.trim() || "",
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

  const saveProfile = async () => {
    const cleanName = form.name.trim();
    const cleanBusinessName = form.business_name.trim();
    const publicName = cleanBusinessName
      ? `${cleanName} (${cleanBusinessName})`
      : cleanName;
    const cleanCategory = form.category.trim();
    const startingPrice = Number(form.price_start);
    const yearsExperience = form.years_experience
      ? Number(form.years_experience)
      : null;
    let bookingLink = form.social_link.trim();

    if (!cleanName || !cleanCategory || !form.price_start) {
      alert("Please add your name, service category, and starting price.");
      return;
    }

    if (!Number.isFinite(startingPrice) || startingPrice < 0) {
      alert("Please enter a valid starting price.");
      return;
    }

    if (
      yearsExperience !== null &&
      (!Number.isFinite(yearsExperience) || yearsExperience < 0)
    ) {
      alert("Please enter valid years of experience.");
      return;
    }

    if (bookingLink && !/^https?:\/\//i.test(bookingLink)) {
      bookingLink = `https://${bookingLink}`;
    }

    if (bookingLink) {
      try {
        new URL(bookingLink);
      } catch {
        alert("Please enter a valid booking link.");
        return;
      }
    }

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
        name: publicName,
        category: cleanCategory,
        location: form.address,
        address: form.address,
        latitude: finalLatitude,
        longitude: finalLongitude,
        price_start: startingPrice,
        phone: form.phone,
        social_link: bookingLink,
        bio: form.bio,
        availability: form.availability,
        profile_image_url: form.profile_image_url,
        years_experience: yearsExperience,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setForm((current) => ({
      ...current,
      name: cleanName,
      business_name: cleanBusinessName,
      category: cleanCategory,
      social_link: bookingLink,
    }));

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

        <AccountMenu />
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

        <div className="mt-10 max-w-[780px] rounded-[28px] border border-neutral-200 bg-white p-6 md:p-8">
          <div className="space-y-9">
            <section>
              <p className={sectionTitleClass}>Basic info</p>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-neutral-700">Your name</span>
                  <input type="text" placeholder="Example: Maya Nguyen" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-neutral-700">
                    Business or salon name <span className="font-normal text-neutral-400">(optional)</span>
                  </span>
                  <input type="text" placeholder="Example: Rose Beauty Studio" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={inputClass} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-neutral-700">Service category</span>
                  <input type="text" placeholder="Example: Nail Technician" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-neutral-700">Starting price</span>
                  <input type="number" placeholder="Example: 35" value={form.price_start} onChange={(e) => setForm({ ...form, price_start: e.target.value })} className={inputClass} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-neutral-700">
                    Years of experience <span className="font-normal text-neutral-400">(optional)</span>
                  </span>
                  <input type="number" placeholder="Example: 5" value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: e.target.value })} className={inputClass} />
                </label>

              </div>
            </section>

            <section>
              <p className={sectionTitleClass}>Location</p>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-neutral-700">Work or salon address</span>
                  <input
                    type="text"
                    placeholder="Example: 123 Beauty Ave, Tulsa, OK 74103"
                    value={form.address}
                    onChange={(e) => {
                      setLocationSaved(false);
                      setForm({ ...form, address: e.target.value });
                    }}
                    className={inputClass}
                  />
                </label>

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
                  placeholder="Booking link (GlossGenius, Square, Fresha, Instagram...)"
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

                        if (!file.type.startsWith("image/")) {
                          alert("Please choose an image file.");
                          return;
                        }

                        if (file.size > 5 * 1024 * 1024) {
                          alert("Please choose an image smaller than 5 MB.");
                          return;
                        }

                        const {
                          data: { user },
                        } = await supabase.auth.getUser();

                        if (!user) return;

                        setUploadingImage(true);

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

                        setForm({
                          ...form,
                          profile_image_url: data.publicUrl,
                        });
                        setUploadingImage(false);
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

                <div id="availability" className="scroll-mt-28">
                  <label
                    htmlFor="artist-availability"
                    className="text-[14px] font-medium text-neutral-900"
                  >
                    Availability
                  </label>
                  <p className="mt-1 text-[13px] leading-[1.5] text-neutral-500">
                    Share your usual working days and hours. Mention if you also
                    accept flexible requests.
                  </p>
                  <textarea
                    id="artist-availability"
                    placeholder="Example: Monday–Friday, 9 AM–5 PM. Flexible times available by request."
                    value={form.availability}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        availability: e.target.value,
                      })
                    }
                    className="mt-3 h-[110px] w-full resize-none rounded-[14px] border border-neutral-200 px-4 py-3 text-[15px] outline-none transition focus:border-black"
                  />
                </div>
              </div>
            </section>

            <button
              onClick={saveProfile}
              disabled={loading || uploadingImage}
              className="w-full rounded-full bg-black px-6 py-3 text-[15px] text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {uploadingImage
                ? "Uploading photo..."
                : loading
                ? "Saving changes..."
                : "Save changes"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
