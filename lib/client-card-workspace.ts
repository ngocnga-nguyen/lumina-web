export const CLIENT_CARD_SECTION_IDS = [
  "service_history",
  "results",
  "consultation",
  "notes",
  "preferences",
] as const;

export type ClientCardSectionId = (typeof CLIENT_CARD_SECTION_IDS)[number];

export const OPTIONAL_CLIENT_CARD_SECTIONS: readonly ClientCardSectionId[] = [
  "results",
  "consultation",
  "notes",
  "preferences",
];

export const PRIMARY_CLIENT_CARD_SECTIONS: readonly ClientCardSectionId[] = [
  "service_history",
  "results",
  "consultation",
];

export const SUPPORTING_CLIENT_CARD_SECTIONS: readonly ClientCardSectionId[] = [
  "notes",
  "preferences",
];

export type ClientCardWorkspacePreferences = {
  version: 1;
  template: "general" | "lashes" | "nails" | "hair" | "brows" | "facial";
  order: ClientCardSectionId[];
  collapsed: ClientCardSectionId[];
  hidden: ClientCardSectionId[];
};

export const DEFAULT_CLIENT_CARD_WORKSPACE: ClientCardWorkspacePreferences = {
  version: 1,
  template: "general",
  order: [...CLIENT_CARD_SECTION_IDS],
  collapsed: [],
  hidden: [],
};

const sectionIds = new Set<string>(CLIENT_CARD_SECTION_IDS);
const optionalSectionIds = new Set<string>(OPTIONAL_CLIENT_CARD_SECTIONS);
const templateKeys = new Set(["general", "lashes", "nails", "hair", "brows", "facial"]);

function parseSectionList(value: unknown, optionalOnly = false) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((item): item is ClientCardSectionId => {
    if (typeof item !== "string" || seen.has(item)) return false;
    if (optionalOnly ? !optionalSectionIds.has(item) : !sectionIds.has(item)) return false;
    seen.add(item);
    return true;
  });
}

export function parseClientCardWorkspacePreferences(
  value: unknown
): ClientCardWorkspacePreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_CLIENT_CARD_WORKSPACE, order: [...CLIENT_CARD_SECTION_IDS] };
  }

  const input = value as Record<string, unknown>;
  const parsedOrder = parseSectionList(input.order);
  const order = [
    ...parsedOrder,
    ...CLIENT_CARD_SECTION_IDS.filter((section) => !parsedOrder.includes(section)),
  ];
  const template =
    typeof input.template === "string" && templateKeys.has(input.template)
      ? (input.template as ClientCardWorkspacePreferences["template"])
      : "general";

  return {
    version: 1,
    template,
    order,
    collapsed: parseSectionList(input.collapsed),
    hidden: parseSectionList(input.hidden, true),
  };
}

export function moveClientCardSection(
  preferences: ClientCardWorkspacePreferences,
  section: ClientCardSectionId,
  direction: -1 | 1
) {
  const order = [...preferences.order];
  const from = order.indexOf(section);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= order.length) return preferences;
  [order[from], order[to]] = [order[to], order[from]];
  return { ...preferences, order };
}

export function moveClientCardSectionWithinColumn(
  preferences: ClientCardWorkspacePreferences,
  section: ClientCardSectionId,
  direction: -1 | 1
) {
  const column = PRIMARY_CLIENT_CARD_SECTIONS.includes(section)
    ? PRIMARY_CLIENT_CARD_SECTIONS
    : SUPPORTING_CLIENT_CARD_SECTIONS;
  const orderedColumn = preferences.order.filter((item) => column.includes(item));
  const from = orderedColumn.indexOf(section);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= orderedColumn.length) return preferences;

  const target = orderedColumn[to];
  const order = [...preferences.order];
  const sectionIndex = order.indexOf(section);
  const targetIndex = order.indexOf(target);
  [order[sectionIndex], order[targetIndex]] = [order[targetIndex], order[sectionIndex]];
  return { ...preferences, order };
}

export function toggleClientCardSection(
  preferences: ClientCardWorkspacePreferences,
  section: ClientCardSectionId,
  key: "collapsed" | "hidden"
) {
  if (key === "hidden" && !optionalSectionIds.has(section)) return preferences;
  const current = preferences[key];
  return {
    ...preferences,
    [key]: current.includes(section)
      ? current.filter((item) => item !== section)
      : [...current, section],
  };
}

export const CLIENT_CARD_TAG_LIMIT = 20;
export const CLIENT_CARD_TAG_MAX_LENGTH = 48;

export function addClientCardTag(existing: string[], rawValue: string) {
  const tag = rawValue.trim().replace(/\s+/g, " ");
  if (!tag) return { tags: existing, error: "Enter a tag first." };
  if (tag.length > CLIENT_CARD_TAG_MAX_LENGTH) {
    return { tags: existing, error: `Tags must be ${CLIENT_CARD_TAG_MAX_LENGTH} characters or fewer.` };
  }
  if (existing.length >= CLIENT_CARD_TAG_LIMIT) {
    return { tags: existing, error: `Use up to ${CLIENT_CARD_TAG_LIMIT} tags per client.` };
  }
  if (existing.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
    return { tags: existing, error: "That tag is already on this client." };
  }
  return { tags: [...existing, tag], error: "" };
}
