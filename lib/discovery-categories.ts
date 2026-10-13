// Editorial labels for the marketplace's existing professional categories.
export const discoveryCategories = ["All", "Lashes", "Hair", "Nails", "Esthetics", "Brows", "Makeup"];
const labels: Record<string, string> = {
  "Lash Artist": "Lashes",
  "Hair Stylist": "Hair",
  "Nail Technician": "Nails",
  Aesthetician: "Esthetics",
  "Brow Artist": "Brows",
  "Makeup Artist": "Makeup",
};
export function discoveryCategory(category: string) {
  return labels[category] || category;
}

export function discoveryLocation(location: string) {
  const parts = location.split(",").map(p => p.trim()).filter(Boolean);
  const compact = parts.length >= 3 ? parts.slice(-2).join(", ") : location;
  return compact.replace(/\s+\d{5}(?:-\d{4})?$/, "").trim();
}
