"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { supabase } from "@/lib/supabase";

type PortfolioImage = {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

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

  if (!ctx) {
    throw new Error("Could not create image crop.");
  }

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
      if (!blob) {
        reject(new Error("Could not crop image."));
        return;
      }

      resolve(blob);
    }, "image/jpeg");
  });
}

export default function DashboardPortfolioPage() {
  const [artistId, setArtistId] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: artist, error: artistError } = await supabase
        .from("artists")
        .select("id")
        .eq("id", user.id)
        .single();

      if (artistError || !artist) {
        console.log(artistError);
        return;
      }

      setArtistId(artist.id);

      const { data, error } = await supabase
        .from("portfolio_images")
        .select("*")
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.log(error);
        return;
      }

      setPortfolio(data || []);
    };

    fetchPortfolio();
  }, []);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);

    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const uploadPortfolioImage = async () => {
    if (!artistId) {
      alert("Artist profile not found.");
      return;
    }

    if (!selectedFile || !previewUrl || !croppedAreaPixels) {
      alert("Please choose and adjust an image first.");
      return;
    }

    setLoading(true);

    try {
      const croppedBlob = await createCroppedImage(
        previewUrl,
        croppedAreaPixels
      );

      const fileName = `${artistId}-${Date.now()}.jpg`;
      const filePath = `${artistId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(filePath, croppedBlob, {
          contentType: "image/jpeg",
        });

      if (uploadError) {
        setLoading(false);
        alert(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("portfolio")
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      const { data, error } = await supabase
        .from("portfolio_images")
        .insert([
          {
            artist_id: artistId,
            image_url: imageUrl,
            caption,
          },
        ])
        .select()
        .single();

      setLoading(false);

      if (error) {
        alert(error.message);
        return;
      }

      setPortfolio([data, ...portfolio]);
      setSelectedFile(null);
      setPreviewUrl("");
      setCaption("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);

      alert("Portfolio image uploaded ✨");
    } catch (error) {
      setLoading(false);
      alert("Could not crop image. Try another photo.");
      console.log(error);
    }
  };

  const deletePortfolioImage = async (id: string) => {
    const { error } = await supabase
      .from("portfolio_images")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setPortfolio(portfolio.filter((item) => item.id !== id));
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[#faf6f5]/95 px-5 py-5 text-[15px] backdrop-blur">
        <Link href="/dashboard">← Dashboard</Link>

        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <div className="w-[80px]" />
      </header>

      <section className="px-5 py-10 md:px-10">
        <h1
          className="text-[42px] leading-[1.02] font-semibold md:text-[58px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Portfolio
        </h1>

        <p className="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-neutral-600">
          Upload photos of your work so clients can see your real results before
          they request a service.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[440px_1fr]">
          <div className="rounded-[28px] border border-neutral-200 p-6 md:p-7">
            <h2
              className="text-[30px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Add photo
            </h2>

            <div className="mt-6 space-y-5">
              {!previewUrl ? (
                <label className="flex h-[260px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[22px] border border-dashed border-neutral-300 bg-[#fafafa] transition hover:bg-[#f5f5f5]">
                  <div className="text-center">
                    <p className="text-[16px] font-medium">
                      Upload portfolio photo
                    </p>

                    <p className="mt-2 text-[13px] text-neutral-500">
                      Tap to choose from phone, camera roll, or files
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileSelect(e.target.files?.[0] || null)
                    }
                  />
                </label>
              ) : (
                <div>
                  <div className="relative h-[300px] overflow-hidden rounded-[22px] bg-black">
                    <Cropper
                      image={previewUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(_, croppedPixels) =>
                        setCroppedAreaPixels(croppedPixels)
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <label className="text-[13px] text-neutral-500">
                      Zoom
                    </label>

                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </div>

                  <button
                    onClick={() => handleFileSelect(null)}
                    className="mt-3 text-[13px] text-neutral-500 hover:text-black"
                  >
                    Choose a different photo
                  </button>
                </div>
              )}

              <textarea
                placeholder="Caption, example: Classic manicure with chrome finish"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="h-[110px] w-full resize-none rounded-[14px] border border-neutral-200 px-4 py-3 outline-none transition focus:border-black"
              />
            </div>

            <button
              onClick={uploadPortfolioImage}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-black px-6 py-3 text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Saving photo..." : "Save Cropped Photo"}
            </button>

            <p className="mt-4 text-[13px] leading-[1.5] text-neutral-500">
              Drag the image to adjust it, then use the zoom slider before
              saving.
            </p>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2
                className="text-[30px] font-semibold"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Gallery
              </h2>

              <p className="text-[14px] text-neutral-500">
                {portfolio.length} saved
              </p>
            </div>

            {portfolio.length === 0 ? (
              <div className="rounded-[24px] bg-[#fbf4f4] p-6 text-neutral-600">
                No portfolio images yet. Add your first image to build trust
                with clients.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {portfolio.map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-[22px] bg-[#fbf4f4]"
                  >
                    <img
                      src={item.image_url}
                      alt={item.caption || "Portfolio image"}
                      className="h-[260px] w-full object-cover"
                    />

                    <div className="p-5">
                      {item.caption ? (
                        <p className="whitespace-pre-line text-[14px] leading-[1.6] text-neutral-700">
                          {item.caption}
                        </p>
                      ) : (
                        <p className="text-[14px] text-neutral-400">
                          No caption added.
                        </p>
                      )}

                      <button
                        onClick={() => deletePortfolioImage(item.id)}
                        className="mt-4 text-[13px] text-neutral-400 hover:text-black"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}