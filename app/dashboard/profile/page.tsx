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
  address_line_1: string;
  city: string;
  region: string;
  postal_code: string;
  travels_to_clients: boolean;
  service_area: string;
  hide_street_address: boolean;
  location_type: "salon" | "home_studio" | "mobile_salon" | "travels";
  mobile_location_details: string;
  latitude: string;
  longitude: string;
  price_start: string;
  phone: string;
  social_link: string;
  bio: string;
  availability: string;
  profile_image_url: string;
  years_experience: string;
  experience_unit: "new" | "months" | "years";
  experience_amount: string;
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
    address_line_1: "",
    city: "",
    region: "",
    postal_code: "",
    travels_to_clients: false,
    service_area: "",
    hide_street_address: false,
    location_type: "salon",
    mobile_location_details: "",
    latitude: "",
    longitude: "",
    price_start: "",
    phone: "",
    social_link: "",
    bio: "",
    availability: "",
    profile_image_url: "",
    years_experience: "",
    experience_unit: "new",
    experience_amount: "",
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
        const legacyAddressParts = (data.address || data.location || "")
          .split(",")
          .map((part: string) => part.trim());
        const legacyRegionParts = (legacyAddressParts[2] || "").split(/\s+/);

        setForm({
          name: businessMatch?.[1]?.trim() || savedName,
          business_name: businessMatch?.[2]?.trim() || "",
          category: data.category || "",
          address: data.address || data.location || "",
          address_line_1: data.address_line_1 || legacyAddressParts[0] || "",
          city: data.city || legacyAddressParts[1] || "",
          region: data.region || legacyRegionParts[0] || "",
          postal_code: data.postal_code || legacyRegionParts.slice(1).join(" ") || "",
          travels_to_clients: Boolean(data.travels_to_clients),
          service_area: data.service_area || "",
          hide_street_address: Boolean(data.hide_street_address),
          location_type:
            data.location_type ||
            (data.travels_to_clients ? "travels" : "salon"),
          mobile_location_details: data.mobile_location_details || "",
          latitude: data.latitude?.toString() || "",
          longitude: data.longitude?.toString() || "",
          price_start: data.price_start?.toString() || "",
          phone: data.phone || "",
          social_link: data.social_link || "",
          bio: data.bio || "",
          availability: data.availability || "",
          profile_image_url: data.profile_image_url || "",
          years_experience: data.years_experience?.toString() || "",
          experience_unit:
            data.experience_unit ||
            (Number(data.years_experience) > 0 ? "years" : "new"),
          experience_amount:
            data.experience_amount?.toString() ||
            (Number(data.years_experience) > 0
              ? data.years_experience.toString()
              : ""),
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
    const experienceAmount = form.experience_amount
      ? Number(form.experience_amount)
      : null;
    const yearsExperience =
      form.experience_unit === "new"
        ? 0
        : form.experience_unit === "months" && experienceAmount !== null
          ? experienceAmount / 12
          : experienceAmount;
    const fullAddress = [
      form.address_line_1.trim(),
      form.city.trim(),
      [form.region.trim(), form.postal_code.trim()].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    const cityAndState = [form.city.trim(), form.region.trim()]
      .filter(Boolean)
      .join(", ");
    const servesArea = form.service_area.trim() || cityAndState;
    const publicLocation =
      form.location_type === "mobile_salon"
        ? `Mobile salon${servesArea ? ` serving ${servesArea}` : ""}`
        : form.location_type === "travels"
          ? `Travels to clients${servesArea ? ` in ${servesArea}` : ""}`
          : form.location_type === "home_studio" || form.hide_street_address
            ? cityAndState
            : fullAddress;
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
      experienceAmount !== null &&
      (!Number.isFinite(experienceAmount) || experienceAmount < 0)
    ) {
      alert("Please enter valid years of experience.");
      return;
    }

    if (form.experience_unit !== "new" && (!experienceAmount || experienceAmount < 1)) {
      alert(`Please enter your number of ${form.experience_unit}.`);
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

    if (fullAddress) {
      const coordinates = await getCoordinatesFromAddress(fullAddress);

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
        location: publicLocation,
        address: fullAddress,
        address_line_1: form.address_line_1.trim(),
        city: form.city.trim(),
        region: form.region.trim(),
        postal_code: form.postal_code.trim(),
        travels_to_clients: form.location_type === "travels",
        service_area: form.service_area.trim(),
        hide_street_address: form.hide_street_address,
        location_type: form.location_type,
        mobile_location_details: form.mobile_location_details.trim(),
        latitude: finalLatitude,
        longitude: finalLongitude,
        price_start: startingPrice,
        phone: form.phone,
        social_link: bookingLink,
        bio: form.bio,
        availability: form.availability,
        profile_image_url: form.profile_image_url,
        years_experience: yearsExperience,
        experience_unit: form.experience_unit,
        experience_amount: experienceAmount,
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
      address: fullAddress,
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
                <div>
                  <p className="mb-2 text-[13px] font-medium text-neutral-700">Location type</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {([
                      ["salon", "Salon or studio"],
                      ["home_studio", "Home-based studio"],
                      ["mobile_salon", "Mobile salon"],
                      ["travels", "I travel to clients"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, location_type: value, travels_to_clients: value === "travels", hide_street_address: value === "home_studio" ? true : form.hide_street_address })}
                        className={`rounded-[14px] px-4 py-3 text-left text-[14px] transition ${form.location_type === value ? "bg-black text-white" : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

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

                <div className="rounded-[18px] bg-neutral-50 p-4">
                  <p className="text-[13px] font-medium text-neutral-700">Professional experience</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["new", "months", "years"] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setForm({ ...form, experience_unit: unit, experience_amount: unit === "new" ? "" : form.experience_amount })}
                        className={`rounded-full px-3 py-2 text-[13px] capitalize transition ${form.experience_unit === unit ? "bg-black text-white" : "border border-neutral-200 bg-white text-neutral-600"}`}
                      >
                        {unit === "new" ? "New artist" : unit}
                      </button>
                    ))}
                  </div>
                  {form.experience_unit !== "new" && (
                    <input
                      type="number"
                      min="1"
                      placeholder={`Number of ${form.experience_unit}`}
                      value={form.experience_amount}
                      onChange={(e) => setForm({ ...form, experience_amount: e.target.value })}
                      className={`${inputClass} mt-3`}
                    />
                  )}
                </div>

              </div>
            </section>

            <section>
              <p className={sectionTitleClass}>Location</p>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-neutral-700">Street address</span>
                  <input
                    type="text"
                    placeholder="Example: 123 Beauty Ave"
                    value={form.address_line_1}
                    onChange={(e) => {
                      setLocationSaved(false);
                      setForm({ ...form, address_line_1: e.target.value });
                    }}
                    className={inputClass}
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-medium text-neutral-700">City</span>
                    <input type="text" placeholder="Example: Tulsa" value={form.city} onChange={(e) => { setLocationSaved(false); setForm({ ...form, city: e.target.value }); }} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-medium text-neutral-700">State</span>
                    <input type="text" placeholder="Example: OK" value={form.region} onChange={(e) => { setLocationSaved(false); setForm({ ...form, region: e.target.value }); }} className={inputClass} />
                  </label>
                </div>

                <label className="block sm:max-w-[50%] sm:pr-2">
                  <span className="mb-2 block text-[13px] font-medium text-neutral-700">ZIP code</span>
                  <input type="text" inputMode="numeric" placeholder="Example: 74103" value={form.postal_code} onChange={(e) => { setLocationSaved(false); setForm({ ...form, postal_code: e.target.value }); }} className={inputClass} />
                </label>

                <div className="space-y-3 rounded-[18px] bg-neutral-50 p-4">
                  {(form.location_type === "travels" || form.location_type === "mobile_salon") && (
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-medium text-neutral-700">Service area</span>
                      <input type="text" placeholder="Example: Tulsa and surrounding areas" value={form.service_area} onChange={(e) => setForm({ ...form, service_area: e.target.value })} className={inputClass} />
                    </label>
                  )}
                  {form.location_type === "mobile_salon" && (
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-medium text-neutral-700">Usual locations or schedule <span className="font-normal text-neutral-400">(optional)</span></span>
                      <textarea placeholder="Example: Downtown Tulsa on weekdays; Broken Arrow on Saturdays" value={form.mobile_location_details} onChange={(e) => setForm({ ...form, mobile_location_details: e.target.value })} className="h-[90px] w-full resize-none rounded-[14px] border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-black" />
                    </label>
                  )}
                  <label className="flex cursor-pointer items-start gap-3 text-[14px] text-neutral-700">
                    <input type="checkbox" checked={form.hide_street_address} onChange={(e) => setForm({ ...form, hide_street_address: e.target.checked })} className="mt-0.5 h-4 w-4 accent-black" />
                    <span>{form.location_type === "mobile_salon" || form.location_type === "travels" ? "Keep my base address private" : "Hide my exact street address from clients"}</span>
                  </label>
                  {(form.location_type === "mobile_salon" || form.location_type === "travels") && (
                    <p className="text-[12px] leading-[1.5] text-neutral-500">Exact appointment details can be shared after the booking is confirmed.</p>
                  )}
                </div>

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
