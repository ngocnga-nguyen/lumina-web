"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import IdentityAvatar from "@/components/IdentityAvatar";
import MobileManagementSheet from "@/components/MobileManagementSheet";
import MobileSettingsRow from "@/components/MobileSettingsRow";
import ProfessionalOnboardingContext from "@/components/ProfessionalOnboardingContext";
import ProfessionalProfileMediaEditor from "@/components/ProfessionalProfileMediaEditor";
import {
  getArtistCoverImageClass,
  getArtistCoverOverlayClass,
  normalizeArtistCoverStyle,
  type ArtistCoverStyle,
} from "@/lib/artist-cover-style";
import {
  getArtistCoverFramingStyle,
  normalizeArtistCoverFraming,
} from "@/lib/artist-cover-framing";

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
  cover_image_url: string;
  cover_style: ArtistCoverStyle;
  cover_position_x: number;
  cover_position_y: number;
  cover_scale: number;
  profile_image_url: string;
  years_experience: string;
  experience_unit: "new" | "months" | "years";
  experience_amount: string;
};
type MobileProfileGroup = "identity" | "location" | "contact" | "bio";

export default function DashboardProfilePage() {
  const router = useRouter();
  const [artistId, setArtistId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mediaEditorMode, setMediaEditorMode] = useState<
    "cover" | "avatar" | null
  >(null);
  const [locationSaved, setLocationSaved] = useState(false);
  const [portfolioCoverFallback, setPortfolioCoverFallback] = useState("");
  const [onboardingStep, setOnboardingStep] = useState<
    "about" | "availability" | null
  >(null);
  const [mobileGroup, setMobileGroup] = useState<MobileProfileGroup | null>(null);
  const [mobileDraftStart, setMobileDraftStart] = useState<ProfileForm | null>(null);

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
    cover_image_url: "",
    cover_style: "natural",
    cover_position_x: 0.5,
    cover_position_y: 0.5,
    cover_scale: 1,
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
      setArtistId(user.id);

      const requestedStep = new URLSearchParams(window.location.search).get(
        "onboarding"
      );
      if (requestedStep === "about" || requestedStep === "availability") {
        setOnboardingStep(requestedStep);
        setMobileGroup(requestedStep === "availability" ? "bio" : "identity");
      }

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
        const legacyAddressParts = (data.address || data.location || "")
          .split(",")
          .map((part: string) => part.trim());
        const legacyRegionParts = (legacyAddressParts[2] || "").split(/\s+/);

        const coverFraming = normalizeArtistCoverFraming(
          data.cover_position_x,
          data.cover_position_y,
          data.cover_scale
        );
        setForm({
          name: savedName,
          business_name: data.business_name || "",
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
          cover_image_url: data.cover_image_url || "",
          cover_style: normalizeArtistCoverStyle(data.cover_style),
          cover_position_x: coverFraming.positionX,
          cover_position_y: coverFraming.positionY,
          cover_scale: coverFraming.scale,
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

        const { data: portfolioFallbackData } = await supabase
          .from("portfolio_images")
          .select("image_url, entry_type")
          .eq("artist_id", user.id)
          .order("created_at", { ascending: false });

        const firstPortfolioImage = portfolioFallbackData?.find(
          (image) => image.entry_type !== "before_after"
        );
        setPortfolioCoverFallback(firstPortfolioImage?.image_url || "");

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
        name: cleanName,
        business_name: cleanBusinessName || null,
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
        cover_image_url: form.cover_image_url || null,
        cover_style: form.cover_style,
        cover_position_x: form.cover_position_x,
        cover_position_y: form.cover_position_y,
        cover_scale: form.cover_scale,
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

    if (onboardingStep === "about") {
      router.push("/dashboard/onboarding?step=services");
      return;
    }
    if (onboardingStep === "availability") {
      router.push("/dashboard/onboarding?step=license");
      return;
    }

    setMobileGroup(null);
    setMobileDraftStart(null);
    alert("Profile updated ✨");
  };

  const openMobileGroup = (group: MobileProfileGroup) => {
    setMobileDraftStart({ ...form });
    setMobileGroup(group);
  };
  const closeMobileGroup = () => {
    if (mobileDraftStart) setForm(mobileDraftStart);
    setMobileDraftStart(null);
    setMobileGroup(null);
  };

  const inputClass =
    "w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60";

  const sectionTitleClass =
    "text-[12px] font-medium uppercase tracking-[0.14em] text-lumina-text-muted";

  const coverPreviewImage =
    form.cover_image_url || portfolioCoverFallback || form.profile_image_url;
  const coverPreviewClass = getArtistCoverImageClass(form.cover_style);
  const coverPreviewOverlayClass = getArtistCoverOverlayClass(form.cover_style);

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="px-5 pb-10 pt-5 lg:hidden">
        {onboardingStep && <ProfessionalOnboardingContext step={onboardingStep} title={onboardingStep === "about" ? "About your business" : "Availability"} />}
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-[11px] uppercase tracking-[0.16em] text-lumina-text-muted">What clients see</p><h1 className="mt-2 font-serif text-[31px] font-semibold leading-[1.05]">Profile</h1></div>
          {artistId && <Link href={`/artist/${artistId}`} className="mt-2 shrink-0 text-[12px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4">View public profile</Link>}
        </div>
        <p className="mt-2 text-[13px] text-lumina-text-muted">Keep your public details current.</p>

        <section className="mt-6 overflow-hidden rounded-[20px] bg-lumina-surface-soft/70" aria-label="Profile appearance">
          <button type="button" onClick={() => setMediaEditorMode("cover")} disabled={!artistId} className="relative block h-32 w-full overflow-hidden bg-lumina-pearl text-left" aria-label="Edit cover image">
            {coverPreviewImage ? <><img src={coverPreviewImage} alt="Cover preview" className={coverPreviewClass} style={getArtistCoverFramingStyle({ positionX: form.cover_position_x, positionY: form.cover_position_y, scale: form.cover_scale }, form.cover_style)} />{coverPreviewOverlayClass && <span className={coverPreviewOverlayClass} aria-hidden="true" />}</> : <span className="flex h-full items-center justify-center text-[12px] text-lumina-text-muted">Add a cover image</span>}
            <span className="absolute bottom-2 right-3 inline-flex items-center gap-1 rounded-full bg-lumina-surface/90 px-2.5 py-1.5 text-[11px] backdrop-blur"><Pencil size={12} />Edit cover</span>
          </button>
          <div className="flex items-end gap-3 px-4 pb-4">
            <button type="button" onClick={() => setMediaEditorMode("avatar")} disabled={!artistId} className="relative -mt-8 h-[70px] w-[70px] shrink-0 rounded-full outline outline-2 outline-lumina-surface" aria-label="Change profile photo">
              <IdentityAvatar name={form.name || "Professional"} imageUrl={form.profile_image_url} className="block h-full w-full rounded-full bg-lumina-blush" fallbackClassName="font-serif text-[25px]" />
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-lumina-black text-white"><Pencil size={12} /></span>
            </button>
            <div className="min-w-0 pb-0.5"><p className="truncate font-serif text-[19px] leading-tight">{form.name || "Your professional name"}</p><p className="mt-0.5 truncate text-[12px] text-lumina-text-muted">{form.business_name || form.category || "Public profile appearance"}</p></div>
          </div>
        </section>

        <section className="mt-7" aria-label="Public profile information">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">Public profile information</p>
          <div className="mt-2 border-t border-lumina-border/70">
            <MobileSettingsRow title="Identity & business" detail={[form.business_name || form.name, form.category, form.price_start ? `From $${form.price_start}` : ""].filter(Boolean).join(" · ") || "Name, category, pricing"} onClick={() => openMobileGroup("identity")} />
            <MobileSettingsRow title="Location & service area" detail={[form.city, form.region].filter(Boolean).join(", ") || "Address and client travel"} onClick={() => openMobileGroup("location")} />
            <MobileSettingsRow title="Contact & booking" detail={form.phone || form.social_link || "Phone and booking link"} onClick={() => openMobileGroup("contact")} />
            <MobileSettingsRow title="Bio & availability" detail={form.availability || form.bio || "Introduce your work and hours"} onClick={() => openMobileGroup("bio")} />
          </div>
        </section>
      </section>

      <MobileManagementSheet open={mobileGroup !== null} title={{ identity: "Identity & business", location: "Location & service area", contact: "Contact & booking", bio: "Bio & availability" }[mobileGroup || "identity"]} busy={loading} onClose={closeMobileGroup}>
        <div className="space-y-4 pb-2">
          {mobileGroup === "identity" && <>
            <label className="block text-[13px]">Professional name<input value={form.name} maxLength={160} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} mt-2`} /></label>
            <label className="block text-[13px]">Business / studio name <span className="text-lumina-text-muted">(optional)</span><input value={form.business_name} maxLength={160} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={`${inputClass} mt-2`} /></label>
            <label className="block text-[13px]">Service category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${inputClass} mt-2`} /></label>
            <label className="block text-[13px]">Starting price<input type="number" min="0" value={form.price_start} onChange={(e) => setForm({ ...form, price_start: e.target.value })} className={`${inputClass} mt-2`} /></label>
            <div><p className="text-[13px]">Professional experience</p><div className="mt-2 grid grid-cols-3 gap-2">{(["new", "months", "years"] as const).map((unit) => <button key={unit} type="button" onClick={() => setForm({ ...form, experience_unit: unit, experience_amount: unit === "new" ? "" : form.experience_amount })} className={`min-h-11 rounded-full px-2 text-[12px] capitalize ${form.experience_unit === unit ? "bg-lumina-black text-white" : "border border-lumina-border"}`}>{unit === "new" ? "New artist" : unit}</button>)}</div>{form.experience_unit !== "new" && <input type="number" min="1" value={form.experience_amount} onChange={(e) => setForm({ ...form, experience_amount: e.target.value })} placeholder={`Number of ${form.experience_unit}`} className={`${inputClass} mt-3`} />}</div>
          </>}
          {mobileGroup === "location" && <>
            <div><p className="text-[13px]">Location type</p><div className="mt-2 grid grid-cols-2 gap-2">{([["salon", "Salon or studio"], ["home_studio", "Home-based studio"], ["mobile_salon", "Mobile salon"], ["travels", "I travel to clients"]] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setForm({ ...form, location_type: value, travels_to_clients: value === "travels", hide_street_address: value === "home_studio" ? true : form.hide_street_address })} className={`min-h-11 rounded-[12px] px-2 text-[12px] ${form.location_type === value ? "bg-lumina-black text-white" : "border border-lumina-border"}`}>{label}</button>)}</div></div>
            <label className="block text-[13px]">Street address<input value={form.address_line_1} onChange={(e) => { setLocationSaved(false); setForm({ ...form, address_line_1: e.target.value }); }} className={`${inputClass} mt-2`} /></label>
            <div className="grid grid-cols-2 gap-3"><label className="min-w-0 text-[13px]">City<input value={form.city} onChange={(e) => { setLocationSaved(false); setForm({ ...form, city: e.target.value }); }} className={`${inputClass} mt-2`} /></label><label className="min-w-0 text-[13px]">State<input value={form.region} onChange={(e) => { setLocationSaved(false); setForm({ ...form, region: e.target.value }); }} className={`${inputClass} mt-2`} /></label></div>
            <label className="block text-[13px]">ZIP code<input inputMode="numeric" value={form.postal_code} onChange={(e) => { setLocationSaved(false); setForm({ ...form, postal_code: e.target.value }); }} className={`${inputClass} mt-2`} /></label>
            {(form.location_type === "travels" || form.location_type === "mobile_salon") && <label className="block text-[13px]">Service area<input value={form.service_area} onChange={(e) => setForm({ ...form, service_area: e.target.value })} className={`${inputClass} mt-2`} /></label>}
            {form.location_type === "mobile_salon" && <label className="block text-[13px]">Usual locations or schedule<textarea value={form.mobile_location_details} onChange={(e) => setForm({ ...form, mobile_location_details: e.target.value })} className={`${inputClass} mt-2 min-h-24`} /></label>}
            <label className="flex items-start gap-3 text-[13px]"><input type="checkbox" checked={form.hide_street_address} onChange={(e) => setForm({ ...form, hide_street_address: e.target.checked })} className="mt-1 h-4 w-4 accent-black" /><span>{form.location_type === "mobile_salon" || form.location_type === "travels" ? "Keep my base address private" : "Hide my exact street address from clients"}</span></label>
            <p className="text-[12px] text-lumina-text-muted">Your map pin will be created from this address when you save.{locationSaved ? " Map location saved." : ""}</p>
          </>}
          {mobileGroup === "contact" && <><label className="block text-[13px]">Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${inputClass} mt-2`} /></label><label className="block text-[13px]">Booking link<input value={form.social_link} onChange={(e) => setForm({ ...form, social_link: e.target.value })} placeholder="GlossGenius, Square, Fresha, Instagram..." className={`${inputClass} mt-2`} /></label></>}
          {mobileGroup === "bio" && <><label className="block text-[13px]">Bio<textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`${inputClass} mt-2 min-h-32`} placeholder="Your style, specialties, and what clients can expect" /></label><label className="block text-[13px]">Availability<textarea value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} className={`${inputClass} mt-2 min-h-28`} placeholder="Your usual working days and hours" /></label></>}
          <div className="flex justify-end gap-2 border-t border-lumina-border/70 pt-4"><button type="button" onClick={closeMobileGroup} disabled={loading} className="min-h-11 rounded-full border border-lumina-border px-5 text-[13px]">Cancel</button><button type="button" onClick={() => void saveProfile()} disabled={loading} className="min-h-11 rounded-full bg-lumina-black px-5 text-[13px] text-white disabled:opacity-50">{loading ? "Saving…" : onboardingStep ? "Save and continue" : "Save changes"}</button></div>
        </div>
      </MobileManagementSheet>

      <section className="hidden px-5 py-10 md:px-10 md:py-14 lg:block">
        {onboardingStep && (
          <ProfessionalOnboardingContext
            step={onboardingStep}
            title={
              onboardingStep === "about"
                ? "About your business"
                : "Availability"
            }
          />
        )}
        <h1
          className="text-[42px] leading-[1.02] font-semibold md:text-[56px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Edit profile
        </h1>

        <p className="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-lumina-text-muted">
          Keep your profile clear, accurate, and easy for clients to understand.
        </p>

        <div className="mt-10 max-w-[780px] rounded-[24px] border border-lumina-border bg-lumina-surface p-5 md:p-7">
          <div className="space-y-9">
            <section>
              <p className={sectionTitleClass}>Basic info</p>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-[13px] font-medium text-lumina-text">Location type</p>
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
                        className={`rounded-[14px] px-4 py-3 text-left text-[14px] transition ${form.location_type === value ? "bg-lumina-black text-white" : "border border-lumina-border bg-lumina-surface text-lumina-text-muted hover:border-lumina-text-muted/45 hover:bg-lumina-surface-soft"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-lumina-text">Professional name</span>
                  <input type="text" maxLength={160} placeholder="Example: Maya Nguyen" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-lumina-text">
                    Business / studio name <span className="font-normal text-lumina-text-muted">(optional)</span>
                  </span>
                  <input type="text" maxLength={160} placeholder="Example: Rose Beauty Studio" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={inputClass} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-lumina-text">Service category</span>
                  <input type="text" placeholder="Example: Nail Technician" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-lumina-text">Starting price</span>
                  <input type="number" placeholder="Example: 35" value={form.price_start} onChange={(e) => setForm({ ...form, price_start: e.target.value })} className={inputClass} />
                </label>

                <div className="rounded-[18px] bg-lumina-surface-soft p-4">
                  <p className="text-[13px] font-medium text-lumina-text">Professional experience</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["new", "months", "years"] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setForm({ ...form, experience_unit: unit, experience_amount: unit === "new" ? "" : form.experience_amount })}
                        className={`rounded-full px-3 py-2 text-[13px] capitalize transition ${form.experience_unit === unit ? "bg-lumina-black text-white" : "border border-lumina-border bg-lumina-surface text-lumina-text-muted hover:border-lumina-text-muted/45"}`}
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
                  <span className="mb-2 block text-[13px] font-medium text-lumina-text">Street address</span>
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
                    <span className="mb-2 block text-[13px] font-medium text-lumina-text">City</span>
                    <input type="text" placeholder="Example: Tulsa" value={form.city} onChange={(e) => { setLocationSaved(false); setForm({ ...form, city: e.target.value }); }} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[13px] font-medium text-lumina-text">State</span>
                    <input type="text" placeholder="Example: OK" value={form.region} onChange={(e) => { setLocationSaved(false); setForm({ ...form, region: e.target.value }); }} className={inputClass} />
                  </label>
                </div>

                <label className="block sm:max-w-[50%] sm:pr-2">
                  <span className="mb-2 block text-[13px] font-medium text-lumina-text">ZIP code</span>
                  <input type="text" inputMode="numeric" placeholder="Example: 74103" value={form.postal_code} onChange={(e) => { setLocationSaved(false); setForm({ ...form, postal_code: e.target.value }); }} className={inputClass} />
                </label>

                <div className="space-y-3 rounded-[18px] bg-lumina-surface-soft p-4">
                  {(form.location_type === "travels" || form.location_type === "mobile_salon") && (
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-medium text-lumina-text">Service area</span>
                      <input type="text" placeholder="Example: Tulsa and surrounding areas" value={form.service_area} onChange={(e) => setForm({ ...form, service_area: e.target.value })} className={inputClass} />
                    </label>
                  )}
                  {form.location_type === "mobile_salon" && (
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-medium text-lumina-text">Usual locations or schedule <span className="font-normal text-lumina-text-muted">(optional)</span></span>
                      <textarea placeholder="Example: Downtown Tulsa on weekdays; Broken Arrow on Saturdays" value={form.mobile_location_details} onChange={(e) => setForm({ ...form, mobile_location_details: e.target.value })} className="h-[90px] w-full resize-none rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60" />
                    </label>
                  )}
                  <label className="flex cursor-pointer items-start gap-3 text-[14px] text-lumina-text">
                    <input type="checkbox" checked={form.hide_street_address} onChange={(e) => setForm({ ...form, hide_street_address: e.target.checked })} className="mt-0.5 h-4 w-4 accent-black" />
                    <span>{form.location_type === "mobile_salon" || form.location_type === "travels" ? "Keep my base address private" : "Hide my exact street address from clients"}</span>
                  </label>
                  {(form.location_type === "mobile_salon" || form.location_type === "travels") && (
                    <p className="text-[12px] leading-[1.5] text-lumina-text-muted">Exact appointment details can be shared after the booking is confirmed.</p>
                  )}
                </div>

                <p className="text-[13px] leading-[1.5] text-lumina-text-muted">
                  Your map pin will be created automatically from this address
                  when you save.
                </p>

                {locationSaved && (
                  <p className="inline-block rounded-full bg-lumina-success-soft px-4 py-2 text-[13px] text-lumina-success">
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
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[14px] text-lumina-text-muted">Cover image</p>
                      <p className="mt-1 text-[12px] text-lumina-text-muted">
                        Click the preview to replace or reposition it.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMediaEditorMode("cover")}
                      disabled={!artistId}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-4 text-[12px] text-lumina-text transition hover:border-lumina-text-muted hover:bg-lumina-surface-soft disabled:opacity-50"
                    >
                      <Pencil size={14} aria-hidden="true" />
                      {form.cover_image_url ? "Edit cover" : "Add cover"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMediaEditorMode("cover")}
                    disabled={!artistId}
                    className="group relative block h-[170px] w-full overflow-hidden rounded-[18px] border border-lumina-border bg-lumina-surface-soft text-lumina-text-muted sm:h-[210px]"
                    aria-label={form.cover_image_url ? "Edit cover image" : "Add cover image"}
                  >
                    {coverPreviewImage ? (
                      <>
                        <img
                          src={coverPreviewImage}
                          alt="Cover preview"
                          className={coverPreviewClass}
                          style={getArtistCoverFramingStyle(
                            {
                              positionX: form.cover_position_x,
                              positionY: form.cover_position_y,
                              scale: form.cover_scale,
                            },
                            form.cover_style
                          )}
                        />
                        {coverPreviewOverlayClass && (
                          <span className={coverPreviewOverlayClass} aria-hidden="true" />
                        )}
                      </>
                    ) : (
                      <span className="flex h-full items-center justify-center text-[13px]">
                        Add a cover image
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 rounded-full bg-lumina-surface/90 px-3 py-1.5 text-[11px] text-lumina-text opacity-90 shadow-sm backdrop-blur-[8px] transition group-hover:opacity-100">
                      Edit cover
                    </span>
                  </button>
                </div>

                <div>
                  <p className="mb-3 text-[14px] text-lumina-text-muted">
                    Profile photo
                  </p>

                  <button
                    type="button"
                    onClick={() => setMediaEditorMode("avatar")}
                    disabled={!artistId}
                    className="group relative flex h-[220px] w-full items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-lumina-text-muted/35 bg-lumina-surface-soft transition hover:bg-lumina-pearl disabled:opacity-50"
                  >
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

                        <p className="mt-2 text-[13px] text-lumina-text-muted">
                          Tap to choose from phone or files
                        </p>
                      </div>
                    )}

                    <span className="absolute bottom-3 right-3 rounded-full bg-lumina-surface/90 px-3 py-1.5 text-[11px] text-lumina-text shadow-sm backdrop-blur-[8px]">
                      Change photo
                    </span>
                  </button>
                </div>

                <textarea
                  placeholder="Short bio — describe your style, specialties, and what clients can expect."
                  value={form.bio}
                  onChange={(e) =>
                    setForm({ ...form, bio: e.target.value })
                  }
                  className="h-[130px] w-full resize-none rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
                />

                <div id="availability" className="scroll-mt-28">
                  <label
                    htmlFor="artist-availability"
                    className="text-[14px] font-medium text-lumina-text"
                  >
                    Availability
                  </label>
                  <p className="mt-1 text-[13px] leading-[1.5] text-lumina-text-muted">
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
                    className="mt-3 h-[110px] w-full resize-none rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
                  />
                </div>
              </div>
            </section>

            <button
              onClick={saveProfile}
              disabled={loading}
              className="w-full rounded-full bg-lumina-black px-6 py-3 text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Saving changes..."
                : onboardingStep
                  ? "Save and continue"
                  : "Save changes"}
            </button>
          </div>
        </div>
      </section>

      {artistId && mediaEditorMode && (
        <ProfessionalProfileMediaEditor
          artistId={artistId}
          mode={mediaEditorMode}
          open
          onClose={() => setMediaEditorMode(null)}
          imageUrl={
            mediaEditorMode === "cover"
              ? form.cover_image_url || null
              : form.profile_image_url || null
          }
          fallbackImageUrl={
            mediaEditorMode === "cover"
              ? portfolioCoverFallback || form.profile_image_url || null
              : null
          }
          coverStyle={form.cover_style}
          coverPositionX={form.cover_position_x}
          coverPositionY={form.cover_position_y}
          coverScale={form.cover_scale}
          onSaved={(result) =>
            setForm((current) => ({
              ...current,
              cover_image_url:
                result.coverImageUrl !== undefined
                  ? result.coverImageUrl || ""
                  : current.cover_image_url,
              cover_style: result.coverStyle || current.cover_style,
              cover_position_x:
                result.coverPositionX ?? current.cover_position_x,
              cover_position_y:
                result.coverPositionY ?? current.cover_position_y,
              cover_scale: result.coverScale ?? current.cover_scale,
              profile_image_url:
                result.profileImageUrl || current.profile_image_url,
            }))
          }
        />
      )}
    </div>
  );
}
