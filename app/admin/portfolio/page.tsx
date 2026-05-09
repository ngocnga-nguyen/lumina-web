"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Artist = {
  id: string;
  name: string;
};

type PortfolioImage = {
  id: string;
  artist_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

export default function PortfolioAdminPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [artistId, setArtistId] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const { data: artistData } = await supabase
      .from("artists")
      .select("id, name")
      .order("name", { ascending: true });

    const { data: imageData } = await supabase
      .from("portfolio_images")
      .select("*")
      .order("created_at", { ascending: false });

    setArtists(artistData || []);
    setImages(imageData || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async () => {
    if (!artistId || !file) {
      alert("Please choose an artist and upload a photo.");
      return;
    }

    setLoading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${artistId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("portfolio-images")
      .upload(fileName, file);

    if (uploadError) {
      setLoading(false);
      alert(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("portfolio-images")
      .getPublicUrl(fileName);

    const imageUrl = data.publicUrl;

    const { error: insertError } = await supabase.from("portfolio_images").insert([
      {
        artist_id: artistId,
        image_url: imageUrl,
        caption: caption,
      },
    ]);

    setLoading(false);

    if (insertError) {
      alert(insertError.message);
      return;
    }

    setArtistId("");
    setCaption("");
    setFile(null);
    alert("Portfolio image uploaded ✨");
    fetchData();
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 md:px-10">
        <Link href="/">Lumina</Link>
        <div>Portfolio Admin</div>
        <Link href="/browse">Browse</Link>
      </header>

      <section className="px-4 py-10 md:px-10">
        <h1
          className="text-[42px] font-semibold leading-none md:text-[56px]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Portfolio Uploads
        </h1>

        <p className="mt-3 text-neutral-600">
          Upload portfolio images for each artist.
        </p>

        <div className="mt-8 max-w-[600px] rounded-[22px] bg-[#fbf7f6] p-5 md:p-6">
          <select
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
          >
            <option value="">Select artist</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </select>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-4 w-full border border-neutral-200 bg-white px-4 py-3 text-[15px]"
          />

          <input
            type="text"
            placeholder="Caption optional"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="mt-4 w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
          />

          <button
            onClick={handleUpload}
            disabled={loading}
            className="mt-5 w-full rounded-full bg-black px-6 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload Portfolio Image"}
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {images.map((image) => (
            <div key={image.id} className="rounded-2xl border p-4">
              <img
                src={image.image_url}
                alt={image.caption || "Portfolio image"}
                className="h-[240px] w-full rounded-xl object-cover"
              />

              <p className="mt-3 font-medium">
                {image.caption || "No caption"}
              </p>

              <p className="mt-2 text-xs text-neutral-400">
                Artist ID: {image.artist_id}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}