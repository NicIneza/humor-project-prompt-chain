export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const DUPLICATE_SLUG_MARKERS = [
  "afterglow",
  "echo",
  "facet",
  "ghost",
  "mirror",
  "orbit",
  "prism",
  "remix",
  "riff",
  "signal",
];

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function createUniqueSlugToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6);
}

export function createRelatedDuplicateSlug(sourceSlug: string, baseSlug = sourceSlug) {
  const normalizedSourceSlug = normalizeSlug(sourceSlug) || "humor-flavor";
  const normalizedBaseSlug = normalizeSlug(baseSlug) || normalizedSourceSlug;
  const uniqueToken = createUniqueSlugToken();
  const marker =
    DUPLICATE_SLUG_MARKERS[hashString(`${normalizedSourceSlug}-${uniqueToken}`) % DUPLICATE_SLUG_MARKERS.length];

  return normalizeSlug(`${normalizedBaseSlug}-${marker}-${uniqueToken}`);
}
