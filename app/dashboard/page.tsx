"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProfessionalDashboardDesktopHome from "@/components/ProfessionalDashboardDesktopHome";
import ProfessionalProfileMediaEditor from "@/components/ProfessionalProfileMediaEditor";
import {
  ProfessionalDashboardMobileSummary,
  ProfessionalDashboardMobileWorkspace,
} from "@/components/ProfessionalDashboardMobileHome";
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
  cover_image_url?: string | null;
  cover_style?: "natural" | "soft_blur" | "softened" | null;
  cover_position_x?: number | null;
  cover_position_y?: number | null;
  cover_scale?: number | null;
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
  const [mediaEditorMode, setMediaEditorMode] = useState<
    "cover" | "avatar" | null
  >(null);
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
      <section className="px-3 py-6 md:px-8 md:py-10 lg:px-10">
        {artist && (
          <ProfessionalDashboardMobileSummary
            profileStatus={dashboardProfileStatus}
            profileIsActive={panelMode === "active"}
            onEditAvatar={() => setMediaEditorMode("avatar")}
          />
        )}

        {artist && activationStatusLoaded && showProfilePanel && panelMode === "incomplete" && (
          <div className="mb-0 mt-5 max-w-[1140px] rounded-[22px] border border-lumina-border bg-lumina-surface-soft p-5 md:p-6 lg:hidden">
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
          <div className="mb-0 mt-5 flex max-w-[1140px] flex-col gap-3 rounded-[18px] border border-lumina-glass-border bg-lumina-glass px-5 py-4 backdrop-blur-[10px] sm:flex-row sm:items-center sm:justify-between lg:hidden">
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
          <div className="mb-0 mt-5 flex max-w-[1140px] flex-col gap-4 rounded-[18px] border border-lumina-border bg-lumina-glass px-5 py-4 backdrop-blur-[10px] sm:flex-row sm:items-center sm:justify-between lg:hidden">
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

        {artist && (
          <ProfessionalDashboardMobileWorkspace
            serviceCount={services.length}
            portfolioEntryCount={portfolioCount}
          />
        )}

        {artist && (
          <ProfessionalDashboardDesktopHome
            artist={artist}
            services={services}
            portfolioCount={portfolioCount}
            activationStatus={activationStatus}
            panelMode={panelMode}
            showProfilePanel={activationStatusLoaded && showProfilePanel}
            profileStatus={dashboardProfileStatus}
            profileCompletion={profileCompletion}
            missingProfileItems={missingProfileItems}
            firstIncompleteStep={firstIncompleteStep}
            activatingProfile={activatingProfile}
            onActivateProfile={() => void activateProfile()}
            onDismissActivePanel={dismissActivePanel}
            onEditAvatar={() => setMediaEditorMode("avatar")}
            onEditCover={() => setMediaEditorMode("cover")}
          />
        )}
      </section>

      {artist && mediaEditorMode && (
        <ProfessionalProfileMediaEditor
          artistId={artist.id}
          mode={mediaEditorMode}
          open
          onClose={() => setMediaEditorMode(null)}
          imageUrl={
            mediaEditorMode === "cover"
              ? artist.cover_image_url || null
              : artist.profile_image_url || null
          }
          fallbackImageUrl={
            mediaEditorMode === "cover" ? artist.profile_image_url || null : null
          }
          coverStyle={artist.cover_style || "natural"}
          coverPositionX={Number(artist.cover_position_x ?? 0.5)}
          coverPositionY={Number(artist.cover_position_y ?? 0.5)}
          coverScale={Number(artist.cover_scale ?? 1)}
          onSaved={(result) => {
            setArtist((current) =>
              current
                ? {
                    ...current,
                    profile_image_url:
                      result.profileImageUrl || current.profile_image_url,
                    cover_image_url:
                      result.coverImageUrl !== undefined
                        ? result.coverImageUrl
                        : current.cover_image_url,
                    cover_style: result.coverStyle || current.cover_style,
                    cover_position_x:
                      result.coverPositionX ?? current.cover_position_x,
                    cover_position_y:
                      result.coverPositionY ?? current.cover_position_y,
                    cover_scale: result.coverScale ?? current.cover_scale,
                  }
                : current
            );
            if (result.profileImageUrl) void refreshActivationStatus();
          }}
        />
      )}
    </div>
  );
}
