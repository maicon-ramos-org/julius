import Fuse from "fuse.js";
import { db } from "@/db";
import { needs, productNeeds, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface NeedRecord {
  id: number;
  name: string;
  keywords: string[];
  active: boolean;
}

interface MatchResult {
  needId: number;
  needName: string;
  confidence: number;
}

/**
 * Match a product name against all active needs using fuzzy search.
 * Returns an array of matched needs with confidence scores (0-1).
 */
export function matchProductToNeeds(
  productName: string,
  activeNeeds: NeedRecord[]
): MatchResult[] {
  if (!productName || activeNeeds.length === 0) return [];

  const normalizedProduct = productName.toLowerCase().trim();
  const results: MatchResult[] = [];

  for (const need of activeNeeds) {
    const keywords = need.keywords ?? [need.name.toLowerCase()];
    if (keywords.length === 0) continue;

    // Build a fuse index from the product name tokens
    // We want to check: does ANY keyword match the product name?
    const fuse = new Fuse([normalizedProduct], {
      includeScore: true,
      threshold: 0.4, // 0 = perfect match, 1 = match anything
      distance: 100,
      minMatchCharLength: 2,
    });

    let bestScore = 1; // 1 = worst in fuse scoring
    let matched = false;

    for (const keyword of keywords) {
      const kw = keyword.toLowerCase().trim();
      if (!kw) continue;

      // Direct substring check (high confidence)
      if (normalizedProduct.includes(kw)) {
        const lengthRatio = kw.length / normalizedProduct.length;
        const score = Math.min(0.95, 0.7 + lengthRatio * 0.3);
        if (score > (1 - bestScore)) {
          bestScore = 1 - score; // Convert to fuse score (lower = better)
        }
        matched = true;
        continue;
      }

      // Fuzzy match
      const fuseResults = fuse.search(kw);
      if (fuseResults.length > 0 && fuseResults[0].score !== undefined) {
        if (fuseResults[0].score < bestScore) {
          bestScore = fuseResults[0].score;
        }
        matched = true;
      }
    }

    if (matched) {
      // Convert fuse score (0=best, 1=worst) to confidence (0=worst, 1=best)
      const confidence = Math.round((1 - bestScore) * 100) / 100;
      if (confidence >= 0.5) {
        results.push({
          needId: need.id,
          needName: need.name,
          confidence,
        });
      }
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Load all active needs from the database.
 */
export async function getActiveNeeds(): Promise<NeedRecord[]> {
  return db
    .select({
      id: needs.id,
      name: needs.name,
      keywords: needs.keywords,
      active: needs.active,
    })
    .from(needs)
    .where(eq(needs.active, true));
}

/**
 * Run matching for a single product and persist results to productNeeds.
 * Skips duplicates — won't insert if the same (productId, needId) already exists.
 */
export async function matchAndPersist(productId: number, productName: string): Promise<MatchResult[]> {
  const activeNeeds = await getActiveNeeds();
  const matches = matchProductToNeeds(productName, activeNeeds);

  for (const match of matches) {
    // Check if link already exists
    const existing = await db
      .select({ id: productNeeds.id })
      .from(productNeeds)
      .where(
        and(
          eq(productNeeds.productId, productId),
          eq(productNeeds.needId, match.needId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(productNeeds).values({
        productId,
        needId: match.needId,
        confidence: String(match.confidence),
      });
    } else {
      // Update confidence if it changed
      await db
        .update(productNeeds)
        .set({ confidence: String(match.confidence) })
        .where(
          and(
            eq(productNeeds.productId, productId),
            eq(productNeeds.needId, match.needId)
          )
        );
    }
  }

  return matches;
}

/**
 * Re-match all products against all active needs.
 * Useful when a new need is created or keywords are updated.
 */
export async function rematchAllProducts(): Promise<number> {
  const allProducts = await db
    .select({ id: products.id, name: products.name })
    .from(products);

  let totalMatches = 0;
  const activeNeeds = await getActiveNeeds();

  for (const product of allProducts) {
    const matches = matchProductToNeeds(product.name, activeNeeds);
    for (const match of matches) {
      const existing = await db
        .select({ id: productNeeds.id })
        .from(productNeeds)
        .where(
          and(
            eq(productNeeds.productId, product.id),
            eq(productNeeds.needId, match.needId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(productNeeds).values({
          productId: product.id,
          needId: match.needId,
          confidence: String(match.confidence),
        });
        totalMatches++;
      }
    }
  }

  return totalMatches;
}
