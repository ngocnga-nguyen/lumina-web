"use client";

import Cropper, { type Area, type Point } from "react-easy-crop";
import {
  ImageIcon,
  LoaderCircle,
  Move,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ARTIST_COVER_STYLES,
  getArtistCoverImageClass,
  getArtistCoverOverlayClass,
  type ArtistCoverStyle,
} from "@/lib/artist-cover-style";
import {
  DEFAULT_ARTIST_COVER_FRAMING,
  getArtistCoverFramingStyle,
  normalizeArtistCoverFraming,
  type ArtistCoverFraming,
} from "@/lib/artist-cover-framing";
import { createCroppedProfileImage } from "@/lib/profile-media-image";
import {
  getOwnedProfileImagePath,
  getProfileImageValidationError,
  PROFILE_IMAGE_BUCKET,
} from "@/lib/profile-image-storage";
import { uploadProfileImage } from "@/lib/profile-image-upload";
import { supabase } from "@/lib/supabase";

const COVER_BUCKET = "artist-cover-images";
const COVER_MAX_BYTES = 5 * 1024 * 1024;
const COVER_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type MediaEditorResult = {
  profileImageUrl?: string;
  coverImageUrl?: string | null;
  coverStyle?: ArtistCoverStyle;
  coverPositionX?: number;
  coverPositionY?: number;
  coverScale?: number;
};

type ProfessionalProfileMediaEditorProps = {
  artistId: string;
  mode: "cover" | "avatar";
  open: boolean;
  onClose: () => void;
  onSaved: (result: MediaEditorResult) => void;
  imageUrl: string | null;
  fallbackImageUrl?: string | null;
  coverStyle?: ArtistCoverStyle;
  coverPositionX?: number;
  coverPositionY?: number;
  coverScale?: number;
};

function getOwnedStoragePath(url: string, bucket: string, ownerId: string) {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const pathname = new URL(url).pathname;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const path = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    return path.startsWith(`${ownerId}/`) ? path : null;
  } catch {
    return null;
  }
}

function inferImageType(url: string) {
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".png")) return "image/png";
  if (cleanUrl.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export default function ProfessionalProfileMediaEditor({
  artistId,
  mode,
  open,
  onClose,
  onSaved,
  imageUrl,
  fallbackImageUrl = null,
  coverStyle = "natural",
  coverPositionX = 0.5,
  coverPositionY = 0.5,
  coverScale = 1,
}: ProfessionalProfileMediaEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    framing: ArtistCoverFraming;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [framing, setFraming] = useState<ArtistCoverFraming>(() =>
    normalizeArtistCoverFraming(coverPositionX, coverPositionY, coverScale)
  );
  const [style, setStyle] = useState<ArtistCoverStyle>(coverStyle);
  const [avatarCrop, setAvatarCrop] = useState<Point>({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarCropPixels, setAvatarCropPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const sourceUrl = previewUrl || imageUrl || fallbackImageUrl || "";

  useEffect(() => {
    if (!open) return;
    setSelectedFile(null);
    setPreviewUrl("");
    setFraming(
      normalizeArtistCoverFraming(
        coverPositionX,
        coverPositionY,
        coverScale
      )
    );
    setStyle(coverStyle);
    setAvatarCrop({ x: 0, y: 0 });
    setAvatarZoom(1);
    setAvatarCropPixels(null);
  }, [open, coverPositionX, coverPositionY, coverScale, coverStyle]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, saving]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const chooseFile = () => inputRef.current?.click();

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError =
      mode === "avatar"
        ? getProfileImageValidationError(file)
        : !COVER_TYPES.has(file.type)
          ? "Please choose a JPEG, PNG, or WebP image."
          : file.size > COVER_MAX_BYTES
            ? "Please choose an image smaller than 5 MB."
            : null;
    if (validationError) {
      alert(validationError);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAvatarCrop({ x: 0, y: 0 });
    setAvatarZoom(1);
    setAvatarCropPixels(null);
    if (mode === "cover") {
      setFraming(DEFAULT_ARTIST_COVER_FRAMING);
    }
  };

  const verifyOwner = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user || user.id !== artistId) {
      throw new Error("Only the profile owner can edit this media.");
    }
    return user;
  };

  const removeObjectBestEffort = async (
    bucket: string,
    path: string | null
  ) => {
    if (!path) return;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) console.warn("Previous profile media cleanup failed:", error);
  };

  const uploadCover = async (file: File, ownerId: string) => {
    const extension = COVER_TYPES.get(file.type);
    if (!extension) throw new Error("Unsupported cover image type.");
    const path = `${ownerId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const publicUrl = supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data
      .publicUrl;
    return { path, publicUrl };
  };

  const saveCover = async () => {
    const user = await verifyOwner();
    let uploadedPath: string | null = null;
    let nextUrl = imageUrl;

    try {
      if (selectedFile) {
        const uploaded = await uploadCover(selectedFile, user.id);
        uploadedPath = uploaded.path;
        nextUrl = uploaded.publicUrl;
      }

      const normalized = normalizeArtistCoverFraming(
        framing.positionX,
        framing.positionY,
        framing.scale
      );
      const { data, error } = await supabase
        .from("artists")
        .update({
          cover_image_url: nextUrl,
          cover_style: style,
          cover_position_x: normalized.positionX,
          cover_position_y: normalized.positionY,
          cover_scale: normalized.scale,
        })
        .eq("id", user.id)
        .select(
          "cover_image_url, cover_style, cover_position_x, cover_position_y, cover_scale"
        )
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Your cover settings could not be saved.");

      if (selectedFile && imageUrl && imageUrl !== nextUrl) {
        await removeObjectBestEffort(
          COVER_BUCKET,
          getOwnedStoragePath(imageUrl, COVER_BUCKET, user.id)
        );
      }

      onSaved({
        coverImageUrl: data.cover_image_url,
        coverStyle: data.cover_style,
        coverPositionX: Number(data.cover_position_x),
        coverPositionY: Number(data.cover_position_y),
        coverScale: Number(data.cover_scale),
      });
      onClose();
    } catch (error) {
      if (uploadedPath) await removeObjectBestEffort(COVER_BUCKET, uploadedPath);
      throw error;
    }
  };

  const saveAvatar = async () => {
    const user = await verifyOwner();
    if (!sourceUrl || !avatarCropPixels) {
      throw new Error("Choose and position a profile photo first.");
    }

    const sourceType = selectedFile?.type || inferImageType(sourceUrl);
    const croppedFile = await createCroppedProfileImage(
      sourceUrl,
      avatarCropPixels,
      sourceType
    );
    const uploaded = await uploadProfileImage(croppedFile, user.id);

    try {
      const { data, error } = await supabase
        .from("artists")
        .update({ profile_image_url: uploaded.publicUrl })
        .eq("id", user.id)
        .select("profile_image_url")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Your profile photo could not be saved.");

      if (imageUrl && imageUrl !== uploaded.publicUrl) {
        await removeObjectBestEffort(
          PROFILE_IMAGE_BUCKET,
          getOwnedProfileImagePath(imageUrl, user.id)
        );
      }

      onSaved({ profileImageUrl: data.profile_image_url });
      onClose();
    } catch (error) {
      await removeObjectBestEffort(PROFILE_IMAGE_BUCKET, uploaded.storagePath);
      throw error;
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (mode === "cover") await saveCover();
      else await saveAvatar();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "The profile media could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeCover = async () => {
    if (!imageUrl || saving) return;
    if (!window.confirm("Remove your custom cover image?")) return;
    setSaving(true);
    try {
      const user = await verifyOwner();
      const { data, error } = await supabase
        .from("artists")
        .update({
          cover_image_url: null,
          cover_position_x: 0.5,
          cover_position_y: 0.5,
          cover_scale: 1,
        })
        .eq("id", user.id)
        .select("cover_image_url, cover_position_x, cover_position_y, cover_scale")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Your custom cover could not be removed.");

      await removeObjectBestEffort(
        COVER_BUCKET,
        getOwnedStoragePath(imageUrl, COVER_BUCKET, user.id)
      );
      onSaved({
        coverImageUrl: null,
        coverStyle: style,
        coverPositionX: 0.5,
        coverPositionY: 0.5,
        coverScale: 1,
      });
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "The cover could not be removed.");
    } finally {
      setSaving(false);
    }
  };

  const handleCoverPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!sourceUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      framing,
    };
  };

  const handleCoverPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setFraming((current) =>
      normalizeArtistCoverFraming(
        start.framing.positionX -
          (event.clientX - start.clientX) / Math.max(bounds.width, 1),
        start.framing.positionY -
          (event.clientY - start.clientY) / Math.max(bounds.height, 1),
        current.scale
      )
    );
  };

  const stopCoverDrag = () => {
    dragStartRef.current = null;
  };

  const coverImageClass = getArtistCoverImageClass(style);
  const coverOverlayClass = getArtistCoverOverlayClass(style);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-lumina-black/35 p-0 sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-media-editor-title"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] border border-lumina-glass-border bg-lumina-surface/95 p-5 text-lumina-text shadow-2xl backdrop-blur-[16px] sm:max-w-[640px] sm:rounded-[24px] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-lumina-text-muted">
              Profile media
            </p>
            <h2
              id="profile-media-editor-title"
              className="mt-1 text-[26px] leading-tight"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {mode === "cover" ? "Edit cover" : "Change photo"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close media editor"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text transition hover:bg-lumina-surface-soft disabled:opacity-50"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5">
          {mode === "cover" ? (
            <div
              className="relative h-[230px] touch-none cursor-grab overflow-hidden rounded-[18px] bg-lumina-pearl active:cursor-grabbing sm:h-[300px]"
              tabIndex={sourceUrl ? 0 : -1}
              aria-label={
                sourceUrl
                  ? "Cover preview. Drag or use arrow keys to reposition."
                  : undefined
              }
              onPointerDown={handleCoverPointerDown}
              onPointerMove={handleCoverPointerMove}
              onPointerUp={stopCoverDrag}
              onPointerCancel={stopCoverDrag}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 0.05 : 0.01;
                if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
                  return;
                }
                event.preventDefault();
                setFraming((current) =>
                  normalizeArtistCoverFraming(
                    current.positionX +
                      (event.key === "ArrowLeft"
                        ? -step
                        : event.key === "ArrowRight"
                          ? step
                          : 0),
                    current.positionY +
                      (event.key === "ArrowUp"
                        ? -step
                        : event.key === "ArrowDown"
                          ? step
                          : 0),
                    current.scale
                  )
                );
              }}
            >
              {sourceUrl ? (
                <>
                  <img
                    src={sourceUrl}
                    alt="Cover framing preview"
                    draggable={false}
                    className={`${coverImageClass} select-none`}
                    style={getArtistCoverFramingStyle(framing, style)}
                  />
                  {coverOverlayClass && (
                    <span className={coverOverlayClass} aria-hidden="true" />
                  )}
                  <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-lumina-surface/88 px-3 py-1.5 text-[11px] text-lumina-text shadow-sm backdrop-blur-[8px]">
                    <Move size={13} aria-hidden="true" /> Drag to reposition
                  </span>
                </>
              ) : (
                <button
                  type="button"
                  onClick={chooseFile}
                  className="flex h-full w-full flex-col items-center justify-center text-lumina-text-muted"
                >
                  <ImageIcon size={25} strokeWidth={1.5} aria-hidden="true" />
                  <span className="mt-2 text-[13px]">Choose a cover image</span>
                </button>
              )}
            </div>
          ) : sourceUrl ? (
            <div className="relative h-[300px] overflow-hidden rounded-[18px] bg-[linear-gradient(45deg,var(--lumina-pearl)_25%,transparent_25%),linear-gradient(-45deg,var(--lumina-pearl)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--lumina-pearl)_75%),linear-gradient(-45deg,transparent_75%,var(--lumina-pearl)_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] sm:h-[360px]">
              <Cropper
                image={sourceUrl}
                crop={avatarCrop}
                zoom={avatarZoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setAvatarCrop}
                onZoomChange={setAvatarZoom}
                onCropComplete={(_, pixels) => setAvatarCropPixels(pixels)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={chooseFile}
              className="flex h-[260px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-lumina-text-muted/35 bg-lumina-surface-soft text-lumina-text-muted"
            >
              <Upload size={24} strokeWidth={1.5} aria-hidden="true" />
              <span className="mt-2 text-[13px]">Choose a profile photo</span>
            </button>
          )}
        </div>

        {sourceUrl && (
          <div className="mt-4">
            <label className="flex items-center gap-3 text-[12px] text-lumina-text-muted">
              <span className="w-11 shrink-0">Zoom</span>
              <input
                type="range"
                min={1}
                max={mode === "cover" ? 1.5 : 3}
                step={0.01}
                value={mode === "cover" ? framing.scale : avatarZoom}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (mode === "cover") {
                    setFraming((current) => ({ ...current, scale: value }));
                  } else {
                    setAvatarZoom(value);
                  }
                }}
                className="w-full accent-lumina-black"
              />
              <span className="w-10 text-right tabular-nums">
                {(mode === "cover" ? framing.scale : avatarZoom).toFixed(2)}×
              </span>
            </label>
          </div>
        )}

        {mode === "cover" && (
          <details className="mt-5 rounded-[16px] border border-lumina-border bg-lumina-surface-soft/70 px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-medium text-lumina-text">
              Appearance
            </summary>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-[12px] bg-lumina-pearl p-1">
              {ARTIST_COVER_STYLES.map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="profile-cover-style"
                    value={option.value}
                    checked={style === option.value}
                    onChange={() => setStyle(option.value)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-10 items-center justify-center rounded-[9px] px-2 text-center text-[11px] text-lumina-text-muted transition peer-checked:bg-lumina-surface peer-checked:text-lumina-text peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-lumina-text/30">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </details>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileSelection}
        />

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-lumina-border pt-4">
          <button
            type="button"
            onClick={chooseFile}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-4 text-[13px] text-lumina-text transition hover:border-lumina-text-muted hover:bg-lumina-surface-soft disabled:opacity-50"
          >
            <Upload size={15} aria-hidden="true" />
            {sourceUrl ? "Choose another" : "Choose image"}
          </button>
          {mode === "cover" && imageUrl && (
            <button
              type="button"
              onClick={removeCover}
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[12px] text-lumina-text-muted transition hover:bg-lumina-surface-soft hover:text-lumina-text disabled:opacity-50"
            >
              <Trash2 size={14} aria-hidden="true" /> Remove cover
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-11 rounded-full border border-lumina-border bg-lumina-surface px-4 text-[13px] text-lumina-text disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !sourceUrl || (mode === "avatar" && !avatarCropPixels)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lumina-black px-5 text-[13px] font-medium text-white transition hover:opacity-85 disabled:opacity-45"
            >
              {saving && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
