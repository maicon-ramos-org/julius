/**
 * Normalize a string for comparison: lowercase, trim, remove accents, collapse whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\s+/g, " "); // collapse whitespace
}

/**
 * Check if two market names refer to the same market.
 * Handles common variations like "Tenda" vs "Tenda Atacado" vs "Tenda Atacado ".
 */
export function marketNamesMatch(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  // One contains the other (e.g., "tenda" matches "tenda atacado")
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}
