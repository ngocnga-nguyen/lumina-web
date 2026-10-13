import type { SavedCompareArtist } from "@/components/SavedCompareMobile";
import { supabase } from "@/lib/supabase";

export type DiscoveryLook = {
  id: string;
  artistId: string;
  title: string;
  image: string;
  price: number | null;
  duration: number | null;
  signal?: string;
  demo?: boolean;
};
export type DiscoveryCatalog = { catalog: DiscoveryLook[]; artists: SavedCompareArtist[] };

export async function loadDiscoveryCatalog(): Promise<DiscoveryCatalog> {
  // Only existing public storefront data. No new fields, verification claims or writes.
  const { data: professionals, error } = await supabase.from("artists")
    .select("id,name,category,location,price_start,profile_image_url,availability")
    .eq("is_active", true).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  if (!professionals?.length) return { catalog: [], artists: [] };
  const ids = professionals.map(a => a.id);
  const [work, services] = await Promise.all([
    supabase.from("portfolio_images")
      .select("id,artist_id,image_url,service_name,caption,result_date")
      .in("artist_id", ids).order("created_at", { ascending: false }).limit(150),
    supabase.from("services").select("id,artist_id,service_name,price,duration").in("artist_id", ids),
  ]);
  if (work.error) throw work.error;
  if (services.error) throw services.error;
  const artists: SavedCompareArtist[] = professionals.map(a => ({
    ...a, distance: null, services: (services.data || []).filter(s => s.artist_id === a.id).map(s => ({
      ...s, duration: s.duration == null ? null : Number(s.duration) || null,
    })),
  }));
  const catalog = (work.data || []).filter(w => w.image_url).map(w => {
    const artist = artists.find(a => a.id === w.artist_id)!;
    const service = artist.services.find(s => s.service_name.trim().toLowerCase() === w.service_name?.trim().toLowerCase());
    return {
      id: w.id, artistId: w.artist_id, image: w.image_url,
      title: w.service_name?.trim() || w.caption?.trim().slice(0, 70) || "Portfolio look",
      // An unmatched portfolio image does not imply a service or its price.
      price: service?.price ?? null, duration: service?.duration ?? null,
      signal: w.result_date ? `Result · ${w.result_date}` : "Professional portfolio",
    };
  });
  return { catalog, artists };
}
