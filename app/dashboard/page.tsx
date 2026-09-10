"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  getActivationCompletionPercent,
  getFirstIncompleteOnboardingStep,
  getMissingActivationLabels,
  getProfessionalProfilePanelDismissalKey,
  getProfessionalProfilePanelMode,
  shouldShowProfessionalProfilePanel,
  type ProfessionalActivationStatus,
} from "@/lib/professional-activation";
import {
  loadMyProfessionalActivationStatus,
  setProfessionalProfileVisibility,
} from "@/lib/professional-activation-client";

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
  experience_unit?: "new" | "months" | "years" | null;
  experience_amount?: number | null;
};

type Service = {
  id: string;
  service_name: string;
  price: number | null;
  duration: string | null;
  description: string | null;
};

export default function DashboardPage() {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activationStatus, setActivationStatus] =
    useState<ProfessionalActivationStatus | null>(null);
  const [activationStatusLoaded, setActivationStatusLoaded] = useState(false);
  const [activatingProfile, setActivatingProfile] = useState(false);
  const [activePanelDismissed, setActivePanelDismissed] = useState(false);
  const [panelDismissalResolved, setPanelDismissalResolved] = useState(false);

  const reconcilePanelDismissal = useCallback((status: ProfessionalActivationStatus) => {
    const storageKey = getProfessionalProfilePanelDismissalKey(status.artist_id);
    const panelMode = getProfessionalProfilePanelMode(status);

    if (panelMode !== "active") {
      window.localStorage.removeItem(storageKey);
      setActivePanelDismissed(false);
    } else {
      setActivePanelDismissed(window.localStorage.getItem(storageKey) === "true");
    }
    setPanelDismissalResolved(true);
  }, []);

  const refreshActivationStatus = useCallback(async () => {
    const result = await loadMyProfessionalActivationStatus();
    if (result.error) {
      console.log("Professional activation status fetch error:", result.error);
    } else {
      setActivationStatus(result.data);
      if (result.data) reconcilePanelDismissal(result.data);
    }
    setActivationStatusLoaded(true);
    return result.data;
  }, [reconcilePanelDismissal]);

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
    await refreshActivationStatus();
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

      const { count: portfolioImageCount, error: portfolioError } =
        await supabase
          .from("portfolio_images")
          .select("id", { count: "exact", head: true })
          .eq("artist_id", artistData.id);

      if (portfolioError) {
        console.log(portfolioError);
      } else {
        setPortfolioCount(portfolioImageCount || 0);
      }

      await refreshActivationStatus();
    };

    fetchDashboardData();
  }, [refreshActivationStatus]);

  useEffect(() => {
    const refreshOnFocus = () => void refreshActivationStatus();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshActivationStatus();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [refreshActivationStatus]);

const experienceLabel =
  artist?.experience_unit === "new"
    ? "New Artist"
    : artist?.experience_amount && artist?.experience_unit
      ? `${artist.experience_amount} ${artist.experience_unit === "months" ? "Months" : "Years"} Experience`
      : artist?.years_experience
        ? `${artist.years_experience}+ Years Experience`
        : null;

const professionalHighlights = [
  experienceLabel,

  services.length > 0 &&
    `${services.length} Service${services.length > 1 ? "s" : ""} Listed`,

  portfolioCount > 0 &&
    `${portfolioCount} Portfolio Photo${portfolioCount > 1 ? "s" : ""}`,

].filter(Boolean);

const profileCompletion = activationStatus
  ? getActivationCompletionPercent(activationStatus)
  : 0;
const missingProfileItems = activationStatus
  ? getMissingActivationLabels(activationStatus)
  : [];
const panelState = activationStatus?.license_status === "rejected"
        ? {
            label: "Action required",
            description:
              activationStatus.license_decision_message ||
              "Update your license verification details for another review.",
            className:
              "border-lumina-attention/35 bg-lumina-attention-soft text-lumina-attention",
          }
        : activationStatus?.license_status === "unverified"
          ? {
              label: "Action required",
              description:
                "License verification must be completed before your profile can become active and public.",
              className:
                "border-lumina-glass-border bg-lumina-glass text-lumina-text",
            }
          : activationStatus?.license_status === "pending"
            ? {
                label: "Action required",
                description:
                  "Your verification is pending, but other required profile details still need attention.",
                className:
                  "border-lumina-glass-border bg-lumina-glass text-lumina-text",
              }
          : {
            label: "Action required",
            description:
              "Complete the remaining profile requirements before activation.",
            className:
              "border-lumina-glass-border bg-lumina-glass text-lumina-text",
          };
const firstIncompleteStep = activationStatus
  ? getFirstIncompleteOnboardingStep(activationStatus)
  : "about";

const activateProfile = async () => {
  setActivatingProfile(true);
  const result = await setProfessionalProfileVisibility(true);
  setActivatingProfile(false);

  if (result.error || !result.data) {
    alert(
      result.error?.message ||
        "Complete every activation requirement before activating your profile."
    );
    return;
  }

  setActivationStatus(result.data);
  reconcilePanelDismissal(result.data);
};

const dismissActivePanel = () => {
  if (!activationStatus || getProfessionalProfilePanelMode(activationStatus) !== "active") {
    return;
  }

  window.localStorage.setItem(
    getProfessionalProfilePanelDismissalKey(activationStatus.artist_id),
    "true"
  );
  setActivePanelDismissed(true);
};

const panelMode = activationStatus
  ? getProfessionalProfilePanelMode(activationStatus)
  : null;
const showProfilePanel =
  !!activationStatus &&
  panelDismissalResolved &&
  shouldShowProfessionalProfilePanel(activationStatus, activePanelDismissed);
const dashboardProfileStatus =
  panelMode === "active"
    ? "Profile active"
    : panelMode === "ready"
      ? "Ready to activate"
      : panelMode === "verification_pending"
        ? "Verification pending"
        : panelMode === "incomplete"
          ? "Setup in progress"
          : null;

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="px-4 py-6 md:px-10 md:py-10">
        {artist && activationStatusLoaded && showProfilePanel && panelMode === "incomplete" && (
          <div className="mb-8 max-w-[1140px] rounded-[22px] border border-lumina-border bg-lumina-surface-soft p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-[700px] flex-1">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-lumina-text-muted">
                  Your Lumina profile
                </p>
                <h2 className="mt-2 text-[22px] font-medium">
                  {profileCompletion}% complete
                </h2>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-lumina-pearl">
                  <div
                    className="h-full rounded-full bg-lumina-black transition-all"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <p className="mt-3 text-[13px] leading-[1.6] text-lumina-text-muted">
                  {missingProfileItems.length > 0
                    ? `Complete your ${missingProfileItems.join(", ")} before activation.`
                    : "Complete the remaining profile requirements before activation."}
                </p>
                <div className={`mt-4 rounded-[14px] border px-4 py-3 ${panelState.className}`}>
                  <p className="text-[12px] font-semibold">{panelState.label}</p>
                  <p className="mt-1 whitespace-pre-line text-[12px] leading-[1.55] text-lumina-text-muted">
                    {panelState.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/artist/${artist.id}`}
                  className="rounded-full border border-lumina-text-muted/35 bg-lumina-surface px-5 py-2.5 text-[13px] transition hover:border-lumina-black"
                >
                  View public profile
                </Link>
                {activationStatus.license_status === "rejected" ? (
                  <Link
                    href="/dashboard/settings#license-verification"
                    className="rounded-full bg-lumina-black px-5 py-2.5 text-[13px] text-white transition hover:opacity-80"
                  >
                    Update verification details
                  </Link>
                ) : activationStatus.license_status === "unverified" ? (
                  <Link
                    href="/dashboard/settings#license-verification"
                    className="rounded-full bg-lumina-black px-5 py-2.5 text-[13px] text-white transition hover:opacity-80"
                  >
                    Complete verification
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/onboarding?step=${firstIncompleteStep}`}
                    className="rounded-full bg-lumina-black px-5 py-2.5 text-[13px] text-white transition hover:opacity-80"
                  >
                    Continue setup
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {artist && activationStatusLoaded && showProfilePanel && panelMode === "verification_pending" && (
          <div className="mb-8 flex max-w-[1140px] flex-col gap-3 rounded-[18px] border border-lumina-glass-border bg-lumina-glass px-5 py-4 backdrop-blur-[10px] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
                Your Lumina profile · {profileCompletion}% complete
              </p>
              <p className="mt-1 text-[15px] font-medium text-lumina-text">
                Verification pending
              </p>
              <p className="mt-1 text-[12px] leading-5 text-lumina-text-muted">
                Lumina is reviewing your license details. Your dashboard remains available while you wait.
              </p>
            </div>
          </div>
        )}

        {artist && activationStatusLoaded && showProfilePanel && panelMode === "ready" && (
          <div className="mb-8 flex max-w-[1140px] flex-col gap-4 rounded-[18px] border border-lumina-border bg-lumina-glass px-5 py-4 backdrop-blur-[10px] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
                Your Lumina profile · 100% complete
              </p>
              <p className="mt-1 text-[15px] font-medium text-lumina-text">
                Ready to activate
              </p>
              <p className="mt-1 text-[12px] text-lumina-text-muted">
                Your profile meets every activation requirement.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/artist/${artist.id}`}
                className="rounded-full border border-lumina-text-muted/35 bg-lumina-surface px-5 py-2.5 text-[13px] transition hover:border-lumina-black"
              >
                View public profile
              </Link>
              <button
                type="button"
                onClick={() => void activateProfile()}
                disabled={activatingProfile}
                className="rounded-full bg-lumina-black px-5 py-2.5 text-[13px] text-white transition hover:opacity-80 disabled:opacity-50"
              >
                {activatingProfile ? "Activating…" : "Activate profile"}
              </button>
            </div>
          </div>
        )}

        {artist && activationStatusLoaded && showProfilePanel && panelMode === "active" && (
          <div className="mb-8 flex max-w-[1140px] items-center gap-3 rounded-[16px] border border-lumina-border bg-lumina-glass px-4 py-3 backdrop-blur-[8px]">
            <CheckCircle2 size={17} strokeWidth={1.7} className="shrink-0 text-lumina-text" />
            <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-2">
              <p className="text-[13px] font-medium text-lumina-text">Profile active</p>
              <p className="truncate text-[12px] text-lumina-text-muted">
                Clients can discover your profile across Lumina.
              </p>
            </div>
            <Link
              href={`/artist/${artist.id}`}
              className="hidden shrink-0 text-[12px] font-medium text-lumina-text-muted underline decoration-lumina-border underline-offset-4 transition hover:text-lumina-text sm:block"
            >
              View public profile
            </Link>
            <button
              type="button"
              onClick={dismissActivePanel}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lumina-text-muted transition hover:bg-lumina-surface/80 hover:text-lumina-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text-muted/50"
              aria-label="Dismiss profile completion panel"
            >
              <X size={15} strokeWidth={1.6} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12 xl:gap-16">
          <div>
            <label className="relative block h-[320px] cursor-pointer overflow-hidden rounded-[22px] bg-lumina-pearl transition hover:opacity-90 sm:h-[380px] lg:h-[420px]">
              {artist?.profile_image_url ? (
                <img
                  src={artist.profile_image_url}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-center text-lumina-text-muted">
                  <div>
                    <p>Profile Image</p>
                    <p className="mt-2 text-[13px]">Tap to upload</p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-4 rounded-full bg-lumina-surface/85 px-4 py-2 text-[13px] shadow-sm">
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

            <div className="mt-6 rounded-[22px] border border-lumina-glass-border bg-lumina-surface/80 p-5 backdrop-blur-[10px]">
              <h2
                className="text-[25px] md:text-[28px]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Availability
              </h2>

              <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.6] text-lumina-text">
                {artist?.availability || "Availability coming soon."}
              </p>

              <Link
                href="/dashboard/profile"
                className="mt-5 inline-block rounded-full border border-lumina-border bg-lumina-surface px-5 py-2 text-[13px] text-lumina-text transition-colors duration-200 hover:border-lumina-black hover:bg-lumina-black hover:text-white focus-visible:border-lumina-black focus-visible:bg-lumina-black focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
              >
                Edit availability
              </Link>
            </div>
          </div>

          <div>
            <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-[760px]">
            <h1
  className="text-[34px] leading-[1.0] font-semibold md:text-[42px]"
  style={{ fontFamily: "'Playfair Display', serif" }}
>
  {artist?.name || "Your Artist Profile"}
</h1>

            <p
              className="mt-3 text-[22px] font-normal text-lumina-text"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {artist?.category || "Service Category"}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-[16px] text-lumina-text">
              <span>Professional Profile</span>
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
  <p className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-lumina-text-muted uppercase">
    Profile details
  </p>

  <div className="mt-3 flex flex-wrap items-center text-[14px] text-lumina-text-muted">
    {professionalHighlights.map((item, index) => (
      <span key={index} className="flex items-center">
  {index !== 0 && (
    <span className="mx-2 text-lumina-text-muted/50">•</span>
  )}

  <span>{item}</span>
</span>
    ))}
  </div>
</div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 xl:w-[190px] xl:flex-col xl:items-stretch">
                {dashboardProfileStatus && (
                  <span className="inline-flex items-center justify-center gap-2 rounded-full border border-lumina-glass-border bg-lumina-glass px-4 py-2 text-[12px] font-medium text-lumina-text backdrop-blur-[8px]">
                    {panelMode === "active" && (
                      <CheckCircle2 size={14} strokeWidth={1.7} aria-hidden="true" />
                    )}
                    {dashboardProfileStatus}
                  </span>
                )}
                {artist && (
                  <Link
                    href={`/artist/${artist.id}`}
                    className="inline-flex justify-center rounded-full border border-lumina-border bg-lumina-surface px-4 py-2 text-[12px] font-medium text-lumina-text transition-colors duration-200 hover:border-lumina-black hover:bg-lumina-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
                  >
                    View public profile
                  </Link>
                )}
                <Link
                  href="/dashboard/profile"
                  className="inline-flex justify-center rounded-full border border-lumina-border bg-lumina-surface px-4 py-2 text-[12px] font-medium text-lumina-text transition-colors duration-200 hover:border-lumina-black hover:bg-lumina-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
                >
                  Edit profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-12 md:mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <nav
              aria-label="Dashboard sections"
              className="grid grid-cols-2 gap-2 text-center text-[14px] sm:flex sm:items-center sm:gap-3 sm:text-[15px]"
            >
              <span className="cursor-default border-b-2 border-lumina-text px-3 py-2.5 leading-none text-lumina-text sm:px-4 sm:py-2">
                Services
              </span>

              <Link
                href="/dashboard/portfolio"
                className="border-b-2 border-transparent px-3 py-2.5 leading-none text-lumina-text-muted transition-colors hover:border-lumina-border hover:text-lumina-text focus-visible:border-lumina-text focus-visible:text-lumina-text focus-visible:outline-none sm:px-4 sm:py-2"
              >
                Portfolio
              </Link>

              <Link
                href="/dashboard/requests"
                className="border-b-2 border-transparent px-3 py-2.5 leading-none text-lumina-text-muted transition-colors hover:border-lumina-border hover:text-lumina-text focus-visible:border-lumina-text focus-visible:text-lumina-text focus-visible:outline-none sm:px-4 sm:py-2"
              >
                Requests
              </Link>

              <Link
                href="/dashboard/clients"
                className="border-b-2 border-transparent px-3 py-2.5 leading-none text-lumina-text-muted transition-colors hover:border-lumina-border hover:text-lumina-text focus-visible:border-lumina-text focus-visible:text-lumina-text focus-visible:outline-none sm:px-4 sm:py-2"
              >
                Clients
              </Link>
            </nav>

            <Link
              href="/dashboard/services"
              className="inline-flex w-fit items-center rounded-full border border-lumina-border bg-lumina-surface px-3 py-1.5 text-[12px] font-medium text-lumina-text-muted transition hover:border-lumina-black hover:text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
            >
              Manage services
            </Link>
          </div>

          {services.length === 0 ? (
            <div className="mt-8 rounded-[20px] border border-lumina-border bg-lumina-surface p-5">
              <h3 className="text-[16px] font-medium text-lumina-text">No services yet</h3>
              <p className="mt-1 text-[14px] leading-[1.55] text-lumina-text-muted">
                Add your first service so clients can see what you offer.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="min-h-[190px] rounded-[20px] border border-lumina-border bg-lumina-surface p-5"
                >
                  <h3
                    className="text-[24px] font-semibold"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    {service.service_name}
                  </h3>

                  <p className="mt-2">Starting at ${service.price}</p>

                  <p className="mt-5 whitespace-pre-line text-[14px] leading-[1.5]">
                    {service.description || "No description added."}
                  </p>

                  <p className="mt-8 text-right text-[13px] text-lumina-text-muted">
                    ◔ {service.duration || "duration"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
