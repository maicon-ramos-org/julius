import { db } from "@/db";
import { markets } from "@/db/schema";
import { normalizeText, marketNamesMatch } from "./normalize";

/**
 * Find a market by name with fuzzy matching (handles accents, whitespace, partial names).
 * If no match found and create=true, creates a new market.
 * Returns market id or null.
 */
export async function findOrCreateMarket(
  name: string,
  create: boolean = true
): Promise<number | null> {
  if (!name || !name.trim()) return null;

  const trimmed = name.trim();

  // Load all markets and compare with normalization
  const allMarkets = await db
    .select({ id: markets.id, name: markets.name })
    .from(markets);

  for (const m of allMarkets) {
    if (marketNamesMatch(m.name, trimmed)) {
      return m.id;
    }
  }

  if (!create) return null;

  // No match — create new market
  const [newMarket] = await db
    .insert(markets)
    .values({ name: trimmed })
    .returning();

  return newMarket.id;
}
