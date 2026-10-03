"use client";

import { useProfessionalReadiness } from "@/components/ProfessionalReadinessProvider";
import ReminderNotificationNotice from "@/components/ReminderNotificationNotice";
import ProfessionalToday from "@/components/ProfessionalToday";
import { PROFESSIONAL_REMINDERS_ENABLED } from "@/lib/professional-reminders-config";
import ProfessionalActivationPanel from "@/components/ProfessionalActivationPanel";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProfessionalDashboardDesktopHome from "@/components/ProfessionalDashboardDesktopHome";
import ProfessionalProfileMediaEditor from "@/components/ProfessionalProfileMediaEditor";
import {
  ProfessionalDashboardMobileSummary,
  ProfessionalDashboardMobileWorkspace,
} from "@/components/ProfessionalDashboardMobileHome";
import {
  getProfessionalActivationLabel,
  getProfessionalProfilePanelDismissalKey,
  getProfessionalProfilePanelMode,
  shouldShowProfessionalProfilePanel,
  type ProfessionalActivationStatus,
} from "@/lib/professional-activation";
import {
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
  const { status: activationStatus, loaded: activationStatusLoaded, refresh: refreshActivationStatus } = useProfessionalReadiness();
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activationStatus) reconcilePanelDismissal(activationStatus);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activationStatus, reconcilePanelDismissal]);

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

    };

    fetchDashboardData();
  }, []);

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

  await refreshActivationStatus();
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
const dashboardProfileStatus = activationStatus ? getProfessionalActivationLabel(activationStatus) : null;

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

        {activationStatus && activationStatusLoaded && showProfilePanel && <div className="lg:hidden"><ProfessionalActivationPanel presentation="dashboard" status={activationStatus} onActivate={() => void activateProfile()} saving={activatingProfile} /></div>}

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
            activatingProfile={activatingProfile}
            onActivateProfile={() => void activateProfile()}
            onDismissActivePanel={dismissActivePanel}
            onEditAvatar={() => setMediaEditorMode("avatar")}
            onEditCover={() => setMediaEditorMode("cover")}
          />
        )}
        <ReminderNotificationNotice />
        {artist && PROFESSIONAL_REMINDERS_ENABLED && <ProfessionalToday key={artist.id} artistId={artist.id} />}
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
