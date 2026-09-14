export type SavedServiceSummary = {
  id: string;
  artist_id: string;
  service_name: string;
  price: number | null;
  duration: number | null;
};

export type SavedReviewRow = {
  artist_id: string;
  rating: number;
};

export type SavedReviewSummary = {
  count: number;
  average: number;
};

type SearchableSavedArtist = {
  name: string;
  business_name?: string | null;
  category?: string | null;
  location?: string | null;
};

export function normalizeSavedSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSavedProfessionalSearch(
  artist: SearchableSavedArtist,
  query: string,
  services: SavedServiceSummary[] = []
) {
  const normalizedQuery = normalizeSavedSearch(query);
  if (!normalizedQuery) return true;

  const searchableText = normalizeSavedSearch(
    [
      artist.name,
      artist.business_name,
      artist.category,
      artist.location,
      ...services.map((service) => service.service_name),
    ]
      .filter(Boolean)
      .join(" ")
  );

  return normalizedQuery
    .split(" ")
    .every((term) => searchableText.includes(term));
}

export function summarizeSavedReviews(rows: SavedReviewRow[]) {
  const totals = new Map<string, { count: number; total: number }>();

  rows.forEach((row) => {
    const current = totals.get(row.artist_id) || { count: 0, total: 0 };
    current.count += 1;
    current.total += Number(row.rating) || 0;
    totals.set(row.artist_id, current);
  });

  return new Map<string, SavedReviewSummary>(
    Array.from(totals.entries()).map(([artistId, value]) => [
      artistId,
      {
        count: value.count,
        average: value.count > 0 ? value.total / value.count : 0,
      },
    ])
  );
}

export function toggleSavedCompareSelection(
  currentIds: string[],
  artistId: string,
  maxSelections = 3
) {
  if (currentIds.includes(artistId)) {
    return {
      ids: currentIds.filter((id) => id !== artistId),
      limitReached: false,
    };
  }

  if (currentIds.length >= maxSelections) {
    return { ids: currentIds, limitReached: true };
  }

  return { ids: [...currentIds, artistId], limitReached: false };
}
