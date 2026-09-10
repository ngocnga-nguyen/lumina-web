"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper, { Area } from "react-easy-crop";
import { supabase } from "@/lib/supabase";
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

      setOnboardingMode(
        new URLSearchParams(window.location.search).get("onboarding") ===
          "portfolio"
      );

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

  const startEditingResult = (result: PortfolioImage) => {
    setEditingResult(result);
    setEntryType("before_after");
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
  };

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="px-5 py-10 md:px-10 md:py-14">
        {onboardingMode && (
          <ProfessionalOnboardingContext
            step="portfolio"
            title="Add representative work"
          />
        )}
        <h1 className="text-[42px] leading-[1.02] font-semibold md:text-[56px]" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
          Results
        </h1>
        <p className="mt-4 max-w-[720px] text-[16px] leading-[1.6] text-lumina-text-muted">
          Show clients finished work or a clear Before & After. Every upload is labeled honestly so clients know what Lumina can—and cannot—confirm.
        </p>

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

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[480px_1fr]">
          <div className="rounded-[24px] border border-lumina-border p-6 md:p-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[30px] font-semibold" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
                {editingResult ? "Edit result" : "Add a result"}
              </h2>
              {editingResult && (
                <button type="button" onClick={resetForm} className="text-[13px] text-lumina-text-muted transition hover:text-lumina-text">
                  Cancel
                </button>
              )}
            </div>

            {!editingResult && (
              <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-lumina-surface-soft p-1">
                <button type="button" onClick={() => { setEntryType("single_photo"); setBeforeFile(null); setBeforePreviewUrl(""); setLinkedRequestId(""); }} className={`rounded-full px-4 py-2 text-[13px] transition ${entryType === "single_photo" ? "bg-lumina-black text-white" : "text-lumina-text-muted"}`}>
                  Finished work
                </button>
                <button type="button" onClick={() => setEntryType("before_after")} className={`rounded-full px-4 py-2 text-[13px] transition ${entryType === "before_after" ? "bg-lumina-black text-white" : "text-lumina-text-muted"}`}>
                  Before & After
                </button>
              </div>
            )}

            <div className="mt-6 space-y-5">
              {entryType === "before_after" && (
                <label className="block cursor-pointer">
                  <span className="mb-2 block text-[13px] font-medium text-lumina-text">Before photo</span>
                  <div className="flex h-[180px] items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-lumina-text-muted/35 bg-lumina-surface-soft">
                    {beforePreviewUrl || editingResult?.before_image_url ? <img src={beforePreviewUrl || editingResult?.before_image_url || ""} alt="Before preview" className="h-full w-full object-cover" /> : <div className="px-4 text-center"><p className="text-[15px] font-medium">Choose before photo</p><p className="mt-1 text-[12px] text-lumina-text-muted">The starting point</p></div>}
                  </div>
                  {editingResult?.before_image_url && <span className="mt-2 block text-[12px] text-lumina-text-muted">Choose a file to replace this photo</span>}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBeforeFileSelect(e.target.files?.[0] || null)} />
                </label>
              )}

              <div>
                <span className="mb-2 block text-[13px] font-medium text-lumina-text">{entryType === "before_after" ? "After photo" : "Finished-work photo"}</span>
                {!previewUrl && editingResult ? (
                  <label className="block cursor-pointer">
                    <img src={editingResult.image_url} alt="Current after" className="h-[240px] w-full rounded-[20px] object-cover" />
                    <span className="mt-2 block text-[12px] text-lumina-text-muted">Choose a file to replace this photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAfterFileSelect(e.target.files?.[0] || null)} />
                  </label>
                ) : !previewUrl ? (
                  <label className="flex h-[240px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-lumina-text-muted/35 bg-lumina-surface-soft transition hover:bg-lumina-pearl">
                    <div className="px-4 text-center"><p className="text-[16px] font-medium">Choose photo</p><p className="mt-2 text-[13px] text-lumina-text-muted">Phone, camera roll, or files</p></div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAfterFileSelect(e.target.files?.[0] || null)} />
                  </label>
                ) : (
                  <div>
                    <div className="relative h-[280px] overflow-hidden rounded-[20px] bg-lumina-black">
                      <Cropper image={previewUrl} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)} />
                    </div>
                    <label className="mt-3 block text-[12px] text-lumina-text-muted">Zoom</label>
                    <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="mt-1 w-full" />
                    <button type="button" onClick={() => handleAfterFileSelect(null)} className="mt-2 text-[12px] text-lumina-text-muted hover:text-lumina-text">Choose a different photo</button>
                  </div>
                )}
              </div>

              <select value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 outline-none focus:border-lumina-black">
                <option value="">{entryType === "before_after" ? "Select service" : "Service (optional)"}</option>
                {services.map((service) => <option key={service.id} value={service.service_name}>{service.service_name}</option>)}
              </select>

              {entryType === "before_after" && (
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-lumina-text">
                    Link to completed appointment <span className="font-normal text-lumina-text-muted">(optional)</span>
                  </span>
                  <select
                    value={linkedRequestId}
                    onChange={(event) => setLinkedRequestId(event.target.value)}
                    className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none focus:border-lumina-black"
                  >
                    <option value="">No appointment linked</option>
                    {completedRequests.map((request) => (
                      <option key={request.id} value={request.id}>
                        {request.client_name?.trim() || "Lumina client"} — {request.service_requested?.trim() || "Service not specified"} — {formatCompletedRequestDate(request)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-[11px] leading-[1.5] text-lumina-text-muted">
                    Linked Results appear on that client&apos;s private Client Card. This does not change the Result&apos;s evidence label.
                  </span>
                </label>
              )}

              <input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-lumina-text-muted outline-none transition focus:border-lumina-text-muted/60" aria-label="Result date (optional)" />
              <textarea placeholder={entryType === "before_after" ? "Short result description" : "Caption (optional)"} value={caption} onChange={(e) => setCaption(e.target.value)} className="h-[110px] w-full resize-none rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60" />
            </div>

            <div className="mt-5 rounded-[16px] bg-lumina-surface-soft p-4 text-[12px] leading-[1.55] text-lumina-text-muted">
              <strong className="text-lumina-text">Added by professional.</strong> Uploading photos does not make them verified. Lumina will only use stronger evidence labels when a result is connected to real completed-service data.
            </div>

            <button onClick={savePortfolioEntry} disabled={loading} className="mt-6 w-full rounded-full bg-lumina-black px-6 py-3 text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-50">
              {loading ? "Saving..." : onboardingMode ? "Save and continue" : editingResult ? "Save changes" : "Save result"}
            </button>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[30px] font-semibold" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>Your results</h2>
              <p className="text-[14px] text-lumina-text-muted">{portfolio.length} saved</p>
            </div>

            {portfolio.length === 0 ? (
              <div className="rounded-[24px] border border-lumina-border bg-lumina-surface p-6">
                <h3 className="text-[16px] font-medium text-lumina-text">No results yet</h3>
                <p className="mt-1 text-[14px] leading-[1.55] text-lumina-text-muted">Add finished work or a Before &amp; After to help clients understand your work.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {portfolio.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-[22px] border border-lumina-border bg-lumina-surface">
                    {item.entry_type === "before_after" && item.before_image_url ? (
                      <div className="grid grid-cols-2">
                        <div className="relative"><img src={item.before_image_url} alt="Before" className="h-[250px] w-full object-cover" /><span className="absolute bottom-3 left-3 rounded-full bg-lumina-surface/90 px-3 py-1 text-[11px]">Before</span></div>
                        <div className="relative"><img src={item.image_url} alt="After" className="h-[250px] w-full object-cover" /><span className="absolute bottom-3 left-3 rounded-full bg-lumina-surface/90 px-3 py-1 text-[11px]">After</span></div>
                      </div>
                    ) : <img src={item.image_url} alt={item.caption || "Finished work"} className="h-[250px] w-full object-cover" />}

                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-lumina-text-muted">
                        <span>{item.entry_type === "before_after" ? "Before & After" : "Finished work"}</span>
                        {item.service_name && <><span>•</span><span>{item.service_name}</span></>}
                      </div>
                      {item.caption && <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.6] text-lumina-text">{item.caption}</p>}
                      {item.result_date && <p className="mt-3 text-[12px] text-lumina-text-muted">{new Date(`${item.result_date}T00:00:00`).toLocaleDateString()}</p>}
                      <p className="mt-4 text-[11px] text-lumina-text-muted">Added by professional</p>
                      <div className="mt-4 flex items-center gap-4">
                        {item.entry_type === "before_after" && (
                          <button onClick={() => startEditingResult(item)} className="text-[13px] text-lumina-text-muted transition hover:text-lumina-text">Edit</button>
                        )}
                        <button onClick={() => deletePortfolioImage(item.id)} className="text-[13px] text-lumina-text-muted hover:text-lumina-text">Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
