import assert from "node:assert/strict";
import test from "node:test";

import {
  matchesSavedProfessionalSearch,
  summarizeSavedReviews,
  toggleSavedCompareSelection,
} from "../lib/saved-professional-view.ts";

const artist = {
  name: "Hong Pham",
  business_name: "Vianne Nails and Spa",
  category: "Nail Technician",
  location: "Pryor, OK",
};

const services = [
  {
    id: "service-1",
    artist_id: "artist-1",
    service_name: "Structured gel manicure",
    price: 65,
    duration: 75,
  },
];

test("saved search matches person, business, category, location, and services", () => {
  assert.equal(matchesSavedProfessionalSearch(artist, "hong", services), true);
  assert.equal(matchesSavedProfessionalSearch(artist, "vianne spa", services), true);
  assert.equal(matchesSavedProfessionalSearch(artist, "nail technician", services), true);
  assert.equal(matchesSavedProfessionalSearch(artist, "pryor", services), true);
  assert.equal(matchesSavedProfessionalSearch(artist, "structured gel", services), true);
  assert.equal(matchesSavedProfessionalSearch(artist, "lash extensions", services), false);
  assert.equal(matchesSavedProfessionalSearch(artist, "", services), true);
});

test("published review rows summarize by professional", () => {
  const summaries = summarizeSavedReviews([
    { artist_id: "artist-1", rating: 5 },
    { artist_id: "artist-1", rating: 4 },
    { artist_id: "artist-2", rating: 3 },
  ]);

  assert.deepEqual(summaries.get("artist-1"), { count: 2, average: 4.5 });
  assert.deepEqual(summaries.get("artist-2"), { count: 1, average: 3 });
});

test("compare selection toggles and preserves the three-professional limit", () => {
  assert.deepEqual(toggleSavedCompareSelection([], "a"), {
    ids: ["a"],
    limitReached: false,
  });
  assert.deepEqual(toggleSavedCompareSelection(["a"], "a"), {
    ids: [],
    limitReached: false,
  });
  assert.deepEqual(toggleSavedCompareSelection(["a", "b", "c"], "d"), {
    ids: ["a", "b", "c"],
    limitReached: true,
  });
});
