/**
 * Brand preference engine — intelligent brand filtering for needs.
 *
 * Parses the `preferred` field of a need and determines whether a given
 * product brand should be shown or excluded from alerts.
 *
 * Examples:
 *   preferred: ["exceto Bohemia", "Brahma e Skol comum"]
 *   → "Bavaria" is EXCLUDED (matches "Bohemia"? no. Matches "Brahma"? no. But...)
 *   → "Brahma Puro Malte" is NOT excluded (contains "Brahma" but also "Puro Malte" = premium)
 *   → "Bavaria" IS excluded (it's the cheap brand user doesn't like)
 *
 *   preferred: ["Prefiro Heineken ou Amstel"]
 *   → "Heineken" INCLUDED
 *   → "Brahma" EXCLUDED (not in the preferred list)
 */

interface PreferenceRule {
  type: "prefer" | "exclude";
  brand: string;         // lowercase, normalized
  modifiers: string[];    // e.g. ["puro malte", "beats"] — these make the brand OK
}

/**
 * Parse a list of preference strings into structured rules.
 * Handles common patterns:
 *   - "exceto X" / "menos X" / "não X" / "except X" → exclude rule
 *   - "só X" / "only X" / "apenas X" → prefer rule (exclusive)
 *   - "prefiro X" / "gosto de X" / "like X" → prefer rule
 *   - bare brand names → prefer rule
 */
export function parsePreferenceRules(preferred: string[]): PreferenceRule[] {
  const rules: PreferenceRule[] = [];

  for (const entry of preferred) {
    if (!entry || typeof entry !== "string") continue;
    const lower = entry.toLowerCase().trim();
    if (!lower) continue;

    // Split by comma or "e" (Portuguese "and")
    const parts = lower.split(/[,;]|\s+e\s+|\s+e\s+/).map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      // Skip very short fragments
      if (part.length < 2) continue;

      // Detect exclusion patterns
      const isExclude =
        lower.includes("exceto") ||
        lower.includes("menos") ||
        lower.includes("não ") ||
        lower.includes("nao ") ||
        lower.includes("except") ||
        lower.includes("exceto") ||
        part.startsWith("não ") ||
        part.startsWith("nao ") ||
        lower.startsWith("exceto") ||
        lower.startsWith("menos");

      // Extract the brand name from exclusion patterns
      let brand = part
        .replace(/^(exceto|menos|não|nao|except|não\s+|nao\s+)/i, "")
        .replace(/[,;.]$/, "")
        .trim();

      // Extract modifiers (words that make the brand OK)
      // e.g. "Brahma puro malte" → brand="Brahma", modifiers=["puro malte"]
      const modifierMatch = brand.match(/^(.+?)\s+(puro\s+malte|superior|long\s+neck|beats|sem\s+álcool|zero)\b/i);
      const modifiers: string[] = [];
      if (modifierMatch) {
        brand = modifierMatch[1].trim();
        modifiers.push(modifierMatch[2].toLowerCase());
      }

      if (brand && brand.length >= 2) {
        rules.push({
          type: isExclude ? "exclude" : "prefer",
          brand: brand.toLowerCase(),
          modifiers,
        });
      }
    }
  }

  return rules;
}

/**
 * Check if a product brand should be EXCLUDED based on the preference rules.
 *
 * Logic:
 * - If there are NO preference rules → nothing is excluded (show everything)
 * - If there are ONLY "prefer" rules (no exclusions) → nothing is excluded
 * - If there are "exclude" rules → check if brand matches any exclusion
 *   - Brand matches exclusion if:
 *     a) brand string CONTAINS the excluded brand term, AND
 *     b) brand does NOT contain any of the modifier terms (e.g. "puro malte", "beats")
 */
export function isBrandExcluded(
  productBrand: string | null,
  preferred: string[]
): boolean {
  if (!productBrand || !preferred || preferred.length === 0) {
    return false;
  }

  const brand = productBrand.toLowerCase();
  const rules = parsePreferenceRules(preferred);

  // No rules = show everything
  if (rules.length === 0) return false;

  // Check for exclusion rules
  const exclusionRules = rules.filter((r) => r.type === "exclude");

  // No exclusions = show everything
  if (exclusionRules.length === 0) return false;

  for (const rule of exclusionRules) {
    // Does the brand contain the excluded term?
    if (brand.includes(rule.brand)) {
      // Does it have a modifier that makes it OK?
      const hasModifier = rule.modifiers.some((mod) => brand.includes(mod));
      if (!hasModifier) {
        // This brand is excluded
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a product brand is PREFERRED (explicitly liked) based on preference rules.
 */
export function isBrandPreferred(
  productBrand: string | null,
  preferred: string[]
): boolean {
  if (!productBrand || !preferred || preferred.length === 0) {
    return false;
  }

  const brand = productBrand.toLowerCase();
  const rules = parsePreferenceRules(preferred);

  // Prefer rules: check if brand matches any of them
  const preferRules = rules.filter((r) => r.type === "prefer");
  for (const rule of preferRules) {
    if (brand.includes(rule.brand)) {
      return true;
    }
  }

  return false;
}
