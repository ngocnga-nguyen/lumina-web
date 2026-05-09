"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Artist = {
  id: string;
  name: string;
};

export default function ProfileImageAdmin() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistId, setArtistId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchArtists = async () => {
      const { data } = await supabase
        .from("artists")
        .select("id,name")
        .order("name");

      setArtists(data || []);
    };

    fetchArtists();
  }, []);

  const handleSave = async () => {
    if (!artistId || !imageUrl) {
      alert("Choose artist + add image URL");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("artists")
      .update({
        profile_image_url: imageUrl,
      })
      .eq("id", artistId);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Profile image saved ✨");
    setImageUrl("");
  };

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-black md:px-10">
      <h1
        className="text-[42px] font-semibold"
        style={{ fontFamily: "Georgia, Times New Roman, serif" }}
      >
        Profile Image Admin
      </h1>

      <p className="mt-3 text-neutral-600">
        Set artist face photo, logo, or brand image.
      </p>

      <div className="mt-10 max-w-[520px] space-y-5">
        <select
          value={artistId}
          onChange={(e) => setArtistId(e.target.value)}
          className="w-full border border-neutral-300 px-4 py-3"
        >
          <option value="">Choose artist</option>

          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Paste image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full border border-neutral-300 px-4 py-3"
        />

        {imageUrl && (
          <img
            src={imageUrl}
            alt="Preview"
            className="h-[260px] w-full object-cover"
          />
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-full bg-black px-6 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Profile Image"}
        </button>
      </div>
    </main>
  );
}