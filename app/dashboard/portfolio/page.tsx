"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, Plus } from "lucide-react";
import Cropper, { Area } from "react-easy-crop";
import { supabase } from "@/lib/supabase";
import MobileManagementSheet from "@/components/MobileManagementSheet";
import ProfessionalOnboardingContext from "@/components/ProfessionalOnboardingContext";

type EntryType = "single_photo" | "before_after";

type PortfolioImage = {
  id: string;
  request_id: string | null;
  image_url: string;
  before_image_url: string | null;
  caption: string | null;
  service_name: string | null;
  result_date: string | null;
  entry_type: EntryType;
  evidence_level: "professional_submitted" | "completed_service" | "client_confirmed";
  created_at: string;
};

type Service = {
  id: string;
  service_name: string;
};

type CompletedRequest = {
  id: string;
  client_name: string | null;
  service_requested: string | null;
  preferred_date: string | null;
  proposed_date: string | null;
  completed_at: string | null;
};

function getCompletedRequestDate(request: CompletedRequest) {
  return request.proposed_date || request.completed_at || request.preferred_date;
}

function formatCompletedRequestDate(request: CompletedRequest) {
  const value = getCompletedRequestDate(request);
  if (!value) return "Date unavailable";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function createCroppedImage(
  imageSrc: string,
  croppedAreaPixels: Area
): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not create image crop.");

  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Could not crop image."));
      resolve(blob);
    }, "image/jpeg", 0.9);
  });
}

function validateImage(file: File | null) {
  if (!file) return true;
  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert("Please choose an image smaller than 10 MB.");
    return false;
  }
  return true;
}

export default function DashboardPortfolioPage() {
  const router = useRouter();
  const [artistId, setArtistId] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [completedRequests, setCompletedRequests] = useState<CompletedRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState(false);
  const [initialLoadAttempt, setInitialLoadAttempt] = useState(0);
  const [entryType, setEntryType] = useState<EntryType>("single_photo");
  const [mobileView, setMobileView] = useState<EntryType>("single_photo");
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [linkedRequestId, setLinkedRequestId] = useState("");
  const [editingResult, setEditingResult] = useState<PortfolioImage | null>(null);
  const [onboardingMode, setOnboardingMode] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [beforePreviewUrl, setBeforePreviewUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPortfolio = async () => {
      setInitialLoadError(false);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (cancelled) return;
      if (!user) return;

      const isOnboarding =
        new URLSearchParams(window.location.search).get("onboarding") ===
        "portfolio";
      setOnboardingMode(isOnboarding);
      if (isOnboarding) setMobileEditorOpen(true);

      const { data: artist, error: artistError } = await supabase
        .from("artists")
        .select("id")
        .eq("id", user.id)
        .single();

      if (cancelled) return;
      if (artistError || !artist) {
        console.log(artistError);
        setInitialLoadError(true);
        return;
      }

      setArtistId(artist.id);

      const [
        { data: portfolioData, error },
        { data: serviceData },
        { data: completedRequestData, error: completedRequestError },
      ] = await Promise.all([
        supabase
          .from("portfolio_images")
          .select("*")
          .eq("artist_id", artist.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("services")
          .select("id, service_name")
          .eq("artist_id", artist.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("client_requests")
          .select(
            "id, client_name, service_requested, preferred_date, proposed_date, completed_at"
          )
          .eq("artist_id", artist.id)
          .eq("booking_status", "completed")
          .order("completed_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (error) {
        console.log(error);
        setInitialLoadError(true);
        return;
      }

      setPortfolio(portfolioData || []);
      setServices(serviceData || []);
      if (completedRequestError) {
        console.log("Completed appointments fetch error:", completedRequestError);
      } else {
        setCompletedRequests((completedRequestData || []) as CompletedRequest[]);
      }
    };

    void fetchPortfolio().catch((error) => {
      if (cancelled) return;
      console.log("Portfolio load failed:", error);
      setInitialLoadError(true);
    });

    return () => {
      cancelled = true;
    };
  }, [initialLoadAttempt]);

  const handleAfterFileSelect = (file: File | null) => {
    if (!validateImage(file)) return;
    setSelectedFile(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  };

  const handleBeforeFileSelect = (file: File | null) => {
    if (!validateImage(file)) return;
    setBeforeFile(file);
    setBeforePreviewUrl(file ? URL.createObjectURL(file) : "");
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setBeforeFile(null);
    setBeforePreviewUrl("");
    setCaption("");
    setServiceName("");
    setResultDate("");
    setLinkedRequestId("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setEditingResult(null);
  };

  const closeMobileEditor = () => {
    if (loading) return;
    resetForm();
    setMobileEditorOpen(false);
  };

  const startAddingEntry = (type: EntryType) => {
    resetForm();
    setEntryType(type);
    setMobileView(type);
    setMobileEditorOpen(true);
  };

  const startEditingEntry = (result: PortfolioImage) => {
    setEditingResult(result);
    setEntryType(result.entry_type);
    setMobileView(result.entry_type);
    setCaption(result.caption || "");
    setServiceName(result.service_name || "");
    setResultDate(result.result_date || "");
    setLinkedRequestId(result.request_id || "");
    setSelectedFile(null);
    setPreviewUrl("");
    setBeforeFile(null);
    setBeforePreviewUrl("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setMobileEditorOpen(true);
    if (window.innerWidth >= 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const uploadBlob = async (blob: Blob, suffix: string, contentType: string) => {
    if (!artistId) throw new Error("Artist profile not found.");
    const filePath = `${artistId}/${Date.now()}-${suffix}`;
    const { error } = await supabase.storage
      .from("portfolio")
      .upload(filePath, blob, { contentType });
    if (error) throw error;
    return supabase.storage.from("portfolio").getPublicUrl(filePath).data.publicUrl;
  };

  const savePortfolioEntry = async () => {
    if (!artistId) return alert("Artist profile not found.");
    if (!editingResult && (!selectedFile || !previewUrl || !croppedAreaPixels)) {
      return alert(`Please choose and adjust the ${entryType === "before_after" ? "after" : "finished"} photo first.`);
    }
    if (editingResult && selectedFile && (!previewUrl || !croppedAreaPixels)) {
      return alert("Please adjust the replacement after photo first.");
    }
    if (entryType === "before_after" && !beforeFile && !editingResult?.before_image_url) {
      return alert("Please add the before photo.");
    }
    if (entryType === "before_after" && !serviceName) {
      return alert("Please select the service shown in this result.");
    }
    if (entryType === "before_after" && !caption.trim()) {
      return alert("Please add a short result description.");
    }

    setLoading(true);
    try {
      let imageUrl = editingResult?.image_url || "";
      let beforeImageUrl = editingResult?.before_image_url || null;

      if (selectedFile && previewUrl && croppedAreaPixels) {
        const croppedBlob = await createCroppedImage(previewUrl, croppedAreaPixels);
        imageUrl = await uploadBlob(croppedBlob, "after.jpg", "image/jpeg");
      }

      if (entryType === "before_after" && beforeFile) {
        const extension = beforeFile.name.split(".").pop() || "jpg";
        beforeImageUrl = await uploadBlob(
          beforeFile,
          `before.${extension}`,
          beforeFile.type || "image/jpeg"
        );
      }

      const entry = {
        artist_id: artistId,
        image_url: imageUrl,
        before_image_url: beforeImageUrl,
        caption: caption.trim() || null,
        service_name: serviceName || null,
        result_date: resultDate || null,
        entry_type: entryType,
        request_id: entryType === "before_after" ? linkedRequestId || null : null,
        evidence_level: editingResult?.evidence_level || ("professional_submitted" as const),
      };

      const query = editingResult
        ? supabase
            .from("portfolio_images")
            .update(entry)
            .eq("id", editingResult.id)
            .eq("artist_id", artistId)
        : supabase.from("portfolio_images").insert([entry]);

      const { data, error } = await query.select().single();

      if (error) throw error;
      setPortfolio((current) =>
        editingResult
          ? current.map((item) => (item.id === data.id ? data : item))
          : [data, ...current]
      );
      const wasEditing = Boolean(editingResult);
      resetForm();
      setMobileEditorOpen(false);
      setSelectedEntryId(null);
      if (onboardingMode) {
        router.push("/dashboard/onboarding?step=availability");
        return;
      }
      alert(
        wasEditing
          ? "Result updated ✨"
          : entryType === "before_after"
            ? "Before & After result saved ✨"
            : "Finished work saved ✨"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save this result.";
      alert(message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const deletePortfolioImage = async (id: string) => {
    if (!window.confirm("Delete this result?")) return;
    const { error } = await supabase.from("portfolio_images").delete().eq("id", id);
    if (error) return alert(error.message);
    setPortfolio((current) => current.filter((item) => item.id !== id));
    setSelectedEntryId((current) => (current === id ? null : current));
  };

  const portfolioEntries = portfolio.filter(
    (item) => item.entry_type === "single_photo"
  );
  const resultEntries = portfolio.filter(
    (item) => item.entry_type === "before_after"
  );

  const formatResultDate = (value: string | null) => {
    if (!value) return "Date not added";
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return "Date not added";
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderEntryForm = (mobile = false, fixedEntryType = false) => (
    <>
      {!editingResult && !mobile && !fixedEntryType && (
        <div className="grid grid-cols-2 gap-2 rounded-full bg-lumina-surface-soft p-1">
          <button
            type="button"
            onClick={() => {
              setEntryType("single_photo");
              setBeforeFile(null);
              setBeforePreviewUrl("");
              setLinkedRequestId("");
            }}
            className={`rounded-full px-4 py-2 text-[13px] transition ${entryType === "single_photo" ? "bg-lumina-black text-white" : "text-lumina-text-muted"}`}
          >
            Finished work
          </button>
          <button
            type="button"
            onClick={() => setEntryType("before_after")}
            className={`rounded-full px-4 py-2 text-[13px] transition ${entryType === "before_after" ? "bg-lumina-black text-white" : "text-lumina-text-muted"}`}
          >
            Before &amp; After
          </button>
        </div>
      )}

      <div className={`${!editingResult && !mobile && !fixedEntryType ? "mt-6" : ""} space-y-5`}>
        {entryType === "before_after" && (
          <label className="block cursor-pointer">
            <span className="mb-2 block text-[13px] font-medium text-lumina-text">
              Before photo
            </span>
            <div className={`flex items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-lumina-text-muted/35 bg-lumina-surface-soft ${mobile ? "h-[160px]" : "h-[180px]"}`}>
              {beforePreviewUrl || editingResult?.before_image_url ? (
                <img
                  src={beforePreviewUrl || editingResult?.before_image_url || ""}
                  alt="Before preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="px-4 text-center">
                  <p className="text-[15px] font-medium">Choose before photo</p>
                  <p className="mt-1 text-[12px] text-lumina-text-muted">The starting point</p>
                </div>
              )}
            </div>
            {editingResult?.before_image_url && (
              <span className="mt-2 block text-[12px] text-lumina-text-muted">
                Choose a file to replace this photo
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) =>
                handleBeforeFileSelect(event.target.files?.[0] || null)
              }
            />
          </label>
        )}

        <div>
          <span className="mb-2 block text-[13px] font-medium text-lumina-text">
            {entryType === "before_after" ? "After photo" : "Finished-work photo"}
          </span>
          {!previewUrl && editingResult ? (
            <label className="block cursor-pointer">
              <img
                src={editingResult.image_url}
                alt={entryType === "before_after" ? "Current after" : "Current work"}
                className={`w-full rounded-[20px] object-cover ${mobile ? "h-[210px]" : "h-[240px]"}`}
              />
              <span className="mt-2 block text-[12px] text-lumina-text-muted">
                Choose a file to replace this photo
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  handleAfterFileSelect(event.target.files?.[0] || null)
                }
              />
            </label>
          ) : !previewUrl ? (
            <label className={`flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-lumina-text-muted/35 bg-lumina-surface-soft transition hover:bg-lumina-pearl ${mobile ? "h-[210px]" : "h-[240px]"}`}>
              <div className="px-4 text-center">
                <p className="text-[16px] font-medium">Choose photo</p>
                <p className="mt-2 text-[13px] text-lumina-text-muted">Phone, camera roll, or files</p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  handleAfterFileSelect(event.target.files?.[0] || null)
                }
              />
            </label>
          ) : (
            <div>
              <div className={`relative overflow-hidden rounded-[20px] bg-lumina-black ${mobile ? "h-[250px]" : "h-[280px]"}`}>
                <Cropper
                  image={previewUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                />
              </div>
              <label className="mt-3 block text-[12px] text-lumina-text-muted">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="mt-1 w-full"
              />
              <button
                type="button"
                onClick={() => handleAfterFileSelect(null)}
                className="mt-2 text-[12px] text-lumina-text-muted hover:text-lumina-text"
              >
                Choose a different photo
              </button>
            </div>
          )}
        </div>

        <select
          value={serviceName}
          onChange={(event) => setServiceName(event.target.value)}
          className="min-w-0 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 outline-none focus:border-lumina-black"
        >
          <option value="">
            {entryType === "before_after" ? "Select service" : "Service (optional)"}
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.service_name}>
              {service.service_name}
            </option>
          ))}
        </select>

        {entryType === "before_after" && (
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-lumina-text">
              Link to completed appointment{" "}
              <span className="font-normal text-lumina-text-muted">(optional)</span>
            </span>
            <select
              value={linkedRequestId}
              onChange={(event) => setLinkedRequestId(event.target.value)}
              className="min-w-0 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none focus:border-lumina-black"
            >
              <option value="">No appointment linked</option>
              {completedRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.client_name?.trim() || "Lumina client"} —{" "}
                  {request.service_requested?.trim() || "Service not specified"} —{" "}
                  {formatCompletedRequestDate(request)}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-[11px] leading-[1.5] text-lumina-text-muted">
              Linked Results appear on that client&apos;s private Client Card. This does not change the Result&apos;s evidence label.
            </span>
          </label>
        )}

        <input
          type="date"
          value={resultDate}
          onChange={(event) => setResultDate(event.target.value)}
          className="min-w-0 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-lumina-text-muted outline-none transition focus:border-lumina-text-muted/60"
          aria-label="Result date (optional)"
        />
        <textarea
          placeholder={entryType === "before_after" ? "Short result description" : "Caption (optional)"}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          className="h-[110px] min-w-0 w-full resize-none break-words rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-lumina-text outline-none transition [overflow-wrap:anywhere] placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
        />
      </div>

      <div className="mt-5 rounded-[16px] bg-lumina-surface-soft p-4 text-[12px] leading-[1.55] text-lumina-text-muted">
        <strong className="text-lumina-text">Added by professional.</strong>{" "}
        Uploading photos does not make them verified. Lumina only uses stronger evidence labels when a Result is connected to completed-service data.
      </div>

      <button
        onClick={() => void savePortfolioEntry()}
        disabled={loading}
        className="mt-6 min-h-11 w-full rounded-full bg-lumina-black px-6 text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading
          ? "Saving..."
          : onboardingMode
            ? "Save and continue"
            : editingResult
              ? "Save changes"
              : entryType === "before_after"
                ? "Save result"
                : "Save work"}
      </button>
    </>
  );

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-8 xl:px-10">
        {onboardingMode && (
          <ProfessionalOnboardingContext
            step="portfolio"
            title="Add representative work"
          />
        )}

        <div className="lg:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">
            Professional workspace
          </p>
          <div className="mt-1 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-[31px] font-semibold leading-[1.04]">
                Portfolio / Results
              </h1>
              <p className="mt-1.5 text-[12px] text-lumina-text-muted">
                Manage what clients see on your profile.
              </p>
            </div>
          </div>
          {artistId && (
            <Link
              href={`/artist/${artistId}`}
              className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-lumina-text-muted transition hover:text-lumina-text"
            >
              View public profile <ExternalLink size={12} aria-hidden="true" />
            </Link>
          )}
          <div
            role="tablist"
            aria-label="Portfolio workspace view"
            className="mt-5 grid min-w-0 grid-cols-2 rounded-full bg-lumina-surface-soft p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === "single_photo"}
              onClick={() => setMobileView("single_photo")}
              className={`min-h-9 min-w-0 rounded-full px-3 text-[12px] font-medium transition ${mobileView === "single_photo" ? "bg-lumina-surface text-lumina-text shadow-[0_2px_10px_rgba(17,17,17,0.06)]" : "text-lumina-text-muted"}`}
            >
              Portfolio
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === "before_after"}
              onClick={() => setMobileView("before_after")}
              className={`min-h-9 min-w-0 rounded-full px-3 text-[12px] font-medium transition ${mobileView === "before_after" ? "bg-lumina-surface text-lumina-text shadow-[0_2px_10px_rgba(17,17,17,0.06)]" : "text-lumina-text-muted"}`}
            >
              Results
            </button>
          </div>
        </div>

        <header className="hidden items-end justify-between gap-6 lg:flex">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">Professional workspace</p>
            <h1 className="mt-2 font-serif text-[34px] font-semibold leading-tight">Portfolio / Results</h1>
            <p className="mt-2 text-[13px] text-lumina-text-muted">Finished work and Before &amp; After outcomes for your public profile.</p>
          </div>
          {artistId && <Link href={`/artist/${artistId}`} className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-lumina-text-muted hover:text-lumina-text">View public profile <ExternalLink size={13} aria-hidden="true" /></Link>}
        </header>

        {initialLoadError && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-lumina-border bg-lumina-surface px-5 py-4 text-[13px] text-lumina-text-muted">
            <span>Your Results workspace could not be loaded.</span>
            <button
              type="button"
              onClick={() => setInitialLoadAttempt((current) => current + 1)}
              className="min-h-10 rounded-full border border-lumina-border px-4 font-medium text-lumina-text"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mt-5 lg:hidden">
          {mobileView === "single_photo" ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[12px] text-lumina-text-muted">
                  {portfolioEntries.length} {portfolioEntries.length === 1 ? "work" : "works"}
                </p>
                <button
                  type="button"
                  onClick={() => startAddingEntry("single_photo")}
                  className="inline-flex min-h-10 max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-lumina-black px-3.5 text-[12px] font-medium text-white"
                >
                  <Plus size={14} aria-hidden="true" /> Add work
                </button>
              </div>
              {portfolioEntries.length === 0 ? (
                <div className="rounded-[18px] border border-lumina-border px-4 py-5">
                  <h2 className="text-[15px] font-medium">No portfolio work yet</h2>
                  <p className="mt-1 text-[12px] leading-[1.5] text-lumina-text-muted">
                    Add finished work to help clients understand your style.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {portfolioEntries.map((item) => {
                    const selected = selectedEntryId === item.id;
                    return (
                      <article
                        key={item.id}
                        className={`overflow-hidden rounded-[16px] border bg-lumina-surface transition ${selected ? "border-lumina-text-muted/45 shadow-[0_8px_22px_rgba(17,17,17,0.07)]" : "border-lumina-border/80"}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedEntryId(selected ? null : item.id)}
                          aria-expanded={selected}
                          className="block w-full text-left"
                        >
                          <img
                            src={item.image_url}
                            alt={item.caption || "Finished work"}
                            className="aspect-square w-full object-cover"
                          />
                          <div className="px-3 py-2">
                            <p className="truncate text-[12px] font-medium">
                              {item.service_name || "Portfolio work"}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-lumina-text-muted">
                              {item.caption || "Finished work"}
                            </p>
                          </div>
                        </button>
                        {selected && (
                          <div className="flex items-center gap-3 border-t border-lumina-border/60 px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => startEditingEntry(item)}
                              className="text-[11px] font-medium"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deletePortfolioImage(item.id)}
                              className="text-[11px] text-lumina-text-muted"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[12px] text-lumina-text-muted">
                  {resultEntries.length} {resultEntries.length === 1 ? "result" : "results"}
                </p>
                <button
                  type="button"
                  onClick={() => startAddingEntry("before_after")}
                  className="inline-flex min-h-10 max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-lumina-black px-3.5 text-[12px] font-medium text-white"
                >
                  <Plus size={14} aria-hidden="true" /> Add result
                </button>
              </div>
              {resultEntries.length === 0 ? (
                <div className="rounded-[18px] border border-lumina-border px-4 py-5">
                  <h2 className="text-[15px] font-medium">No Results yet</h2>
                  <p className="mt-1 text-[12px] leading-[1.5] text-lumina-text-muted">
                    Add a Before &amp; After when you have paired service photos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resultEntries.map((item) => {
                    const selected = selectedEntryId === item.id;
                    return (
                      <article
                        key={item.id}
                        className={`overflow-hidden rounded-[18px] border bg-lumina-surface transition ${selected ? "border-lumina-text-muted/45 shadow-[0_8px_22px_rgba(17,17,17,0.07)]" : "border-lumina-border/80"}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedEntryId(selected ? null : item.id)}
                          aria-expanded={selected}
                          className="block w-full text-left"
                        >
                          <div className="grid grid-cols-2">
                            <div className="relative">
                              <img
                                src={item.before_image_url || item.image_url}
                                alt="Before"
                                className="h-[132px] w-full object-cover"
                              />
                              <span className="absolute bottom-2 left-2 rounded-full bg-lumina-surface/85 px-2 py-0.5 text-[9px] backdrop-blur-sm">
                                Before
                              </span>
                            </div>
                            <div className="relative">
                              <img
                                src={item.image_url}
                                alt="After"
                                className="h-[132px] w-full object-cover"
                              />
                              <span className="absolute bottom-2 left-2 rounded-full bg-lumina-surface/85 px-2 py-0.5 text-[9px] backdrop-blur-sm">
                                After
                              </span>
                            </div>
                          </div>
                          <div className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h2 className="truncate font-serif text-[19px] font-semibold leading-tight">
                                  {item.service_name || "Before & After"}
                                </h2>
                                <p className="mt-0.5 text-[11px] text-lumina-text-muted">
                                  {formatResultDate(item.result_date)}
                                </p>
                              </div>
                              {item.request_id && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lumina-blush/45 px-2.5 py-1 text-[9px] font-medium text-lumina-text">
                                  <Link2 size={10} aria-hidden="true" /> Completed service
                                </span>
                              )}
                            </div>
                            {item.caption && (
                              <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.5] text-lumina-text-muted">
                                {item.caption}
                              </p>
                            )}
                          </div>
                        </button>
                        {selected && (
                          <div className="flex items-center gap-4 border-t border-lumina-border/60 px-4 py-3">
                            <button
                              type="button"
                              onClick={() => startEditingEntry(item)}
                              className="text-[12px] font-medium"
                            >
                              Edit result
                            </button>
                            <button
                              type="button"
                              onClick={() => void deletePortfolioImage(item.id)}
                              className="text-[12px] text-lumina-text-muted"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-7 hidden lg:block">
          <div className="flex items-center justify-between gap-4 border-b border-lumina-border/70 pb-5">
            <div role="tablist" aria-label="Desktop portfolio workspace view" className="inline-flex rounded-full bg-lumina-surface-soft p-1">
              <button type="button" role="tab" aria-selected={mobileView === "single_photo"} onClick={() => setMobileView("single_photo")} className={`min-h-10 rounded-full px-5 text-[13px] font-medium transition ${mobileView === "single_photo" ? "bg-lumina-surface text-lumina-text" : "text-lumina-text-muted"}`}>Portfolio</button>
              <button type="button" role="tab" aria-selected={mobileView === "before_after"} onClick={() => setMobileView("before_after")} className={`min-h-10 rounded-full px-5 text-[13px] font-medium transition ${mobileView === "before_after" ? "bg-lumina-surface text-lumina-text" : "text-lumina-text-muted"}`}>Results</button>
            </div>
            <button type="button" onClick={() => startAddingEntry(mobileView)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-lumina-black px-4 text-[13px] font-medium text-white hover:opacity-85"><Plus size={15} aria-hidden="true" />{mobileView === "single_photo" ? "Add Portfolio item" : "Add Result"}</button>
          </div>

          {mobileEditorOpen && (
            <section aria-label={editingResult ? entryType === "before_after" ? "Edit Result" : "Edit Portfolio item" : entryType === "before_after" ? "Add Result" : "Add Portfolio item"} className="my-6 max-w-[680px] rounded-[16px] border border-lumina-border/70 p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-serif text-[24px] font-semibold">{editingResult ? entryType === "before_after" ? "Edit Result" : "Edit Portfolio item" : entryType === "before_after" ? "Add Result" : "Add Portfolio item"}</h2>
                <button type="button" onClick={closeMobileEditor} disabled={loading} className="min-h-10 px-2 text-[13px] text-lumina-text-muted hover:text-lumina-text disabled:opacity-50">Cancel</button>
              </div>
              <div className="mt-4 max-h-[65dvh] overflow-y-auto overscroll-contain pr-2">{renderEntryForm(false, true)}</div>
            </section>
          )}

          <div className="my-5 flex items-baseline justify-between gap-4">
            <p className="text-[13px] text-lumina-text-muted">{mobileView === "single_photo" ? "A closer look at your finished work." : "Before & After outcomes, added by you."}</p>
            <span className="shrink-0 text-[12px] text-lumina-text-muted">{mobileView === "single_photo" ? portfolioEntries.length : resultEntries.length} {mobileView === "single_photo" ? "items" : "results"}</span>
          </div>
          {(mobileView === "single_photo" ? portfolioEntries : resultEntries).length === 0 ? (
            <div className="py-6">
              <h2 className="text-[15px] font-medium">{mobileView === "single_photo" ? "No portfolio work yet" : "No results yet"}</h2>
              <p className="mt-2 text-[13px] text-lumina-text-muted">{mobileView === "single_photo" ? "Add finished work to show clients your style." : "Add a Before & After to document a service outcome."}</p>
            </div>
          ) : mobileView === "single_photo" ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-7 xl:grid-cols-3">
              {portfolioEntries.map((item) => (
                <article key={item.id} className="min-w-0">
                  <img src={item.image_url} alt={item.caption || "Finished work"} className="aspect-square w-full rounded-[10px] object-cover" />
                  <div className="pt-3">
                    {item.service_name && <h2 className="text-[14px] font-medium">{item.service_name}</h2>}
                    {item.caption && <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-lumina-text-muted">{item.caption}</p>}
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-lumina-text-muted">{item.result_date ? formatResultDate(item.result_date) : ""}</span>
                      <div className="flex items-center gap-4 text-[12px]">
                        <button type="button" onClick={() => startEditingEntry(item)} aria-label={`Edit ${item.caption || item.service_name || "portfolio item"}`} className="min-h-9 text-lumina-text hover:underline">Edit</button>
                        <button type="button" onClick={() => void deletePortfolioImage(item.id)} aria-label={`Delete ${item.caption || item.service_name || "portfolio item"}`} className="min-h-9 text-lumina-text-muted hover:text-lumina-text">Delete</button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 xl:grid-cols-2">
              {resultEntries.map((item) => (
                <article key={item.id} className="min-w-0">
                  <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-[10px]">
                    <div className="relative">
                      <img src={item.before_image_url || ""} alt="Before" className="aspect-[4/3] w-full object-cover" />
                      <span className="absolute bottom-2 left-2 rounded-full bg-lumina-surface/90 px-2.5 py-1 text-[10px]">Before</span>
                    </div>
                    <div className="relative">
                      <img src={item.image_url} alt="After" className="aspect-[4/3] w-full object-cover" />
                      <span className="absolute bottom-2 left-2 rounded-full bg-lumina-surface/90 px-2.5 py-1 text-[10px]">After</span>
                    </div>
                  </div>
                  <div className="pt-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      {item.service_name && <h2 className="font-serif text-[21px] font-semibold">{item.service_name}</h2>}
                      {item.result_date && <span className="text-[11px] text-lumina-text-muted">{formatResultDate(item.result_date)}</span>}
                    </div>
                    {item.caption && <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-lumina-text-muted">{item.caption}</p>}
                    {item.request_id && <p className="mt-2 text-[11px] text-lumina-text-muted">Linked to completed service</p>}
                    <div className="mt-2 flex items-center gap-4 text-[12px]">
                      <button type="button" onClick={() => startEditingEntry(item)} aria-label={`Edit ${item.service_name || "result"}`} className="min-h-9 text-lumina-text hover:underline">Edit</button>
                      <button type="button" onClick={() => void deletePortfolioImage(item.id)} aria-label={`Delete ${item.service_name || "result"}`} className="min-h-9 text-lumina-text-muted hover:text-lumina-text">Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <MobileManagementSheet
        open={mobileEditorOpen}
        title={editingResult ? `Edit ${entryType === "before_after" ? "result" : "work"}` : entryType === "before_after" ? "Add result" : "Add work"}
        busy={loading}
        onClose={closeMobileEditor}
      >
        <div className="pt-2">{renderEntryForm(true)}</div>
      </MobileManagementSheet>
    </div>
  );
}
