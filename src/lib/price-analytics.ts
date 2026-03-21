import { db } from "@/db";
import { prices, products, markets } from "@/db/schema";
import { eq, desc, gte, and, sql } from "drizzle-orm";

export interface ProductStats {
  productId: number;
  productName: string;
  avgPrice30d: number | null;
  minPrice90d: number | null;
  maxPrice90d: number | null;
  stddev30d: number | null;
  priceCount30d: number;
  currentPrice: number | null;
  currentMarket: string | null;
  percentBelowAvg: number | null;
  isGoodDeal: boolean;
  trend: "rising" | "falling" | "stable" | "unknown";
}

/**
 * Get price statistics for a single product.
 */
export async function getProductStats(productId: number): Promise<ProductStats | null> {
  // Get product info
  const [product] = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // 30-day stats using SQL aggregates
  const [stats30d] = await db
    .select({
      avg: sql<string>`AVG(${prices.price}::numeric)`,
      stddev: sql<string>`STDDEV_POP(${prices.price}::numeric)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(prices)
    .where(
      and(eq(prices.productId, productId), gte(prices.createdAt, thirtyDaysAgo))
    );

  // 90-day min/max
  const [stats90d] = await db
    .select({
      min: sql<string>`MIN(${prices.price}::numeric)`,
      max: sql<string>`MAX(${prices.price}::numeric)`,
    })
    .from(prices)
    .where(
      and(eq(prices.productId, productId), gte(prices.createdAt, ninetyDaysAgo))
    );

  // Most recent price
  const [latest] = await db
    .select({
      price: prices.price,
      marketName: markets.name,
      createdAt: prices.createdAt,
    })
    .from(prices)
    .innerJoin(markets, eq(prices.marketId, markets.id))
    .where(eq(prices.productId, productId))
    .orderBy(desc(prices.createdAt))
    .limit(1);

  const avgPrice = stats30d?.avg ? parseFloat(stats30d.avg) : null;
  const stddev = stats30d?.stddev ? parseFloat(stats30d.stddev) : null;
  const currentPrice = latest?.price ? parseFloat(latest.price) : null;

  let percentBelowAvg: number | null = null;
  let isGoodDeal = false;

  if (avgPrice && currentPrice) {
    percentBelowAvg =
      Math.round(((avgPrice - currentPrice) / avgPrice) * 1000) / 10;
    // A "good deal" is below avg - 1 stddev (statistically low)
    if (stddev && stddev > 0) {
      isGoodDeal = currentPrice < avgPrice - stddev;
    } else {
      isGoodDeal = currentPrice < avgPrice * 0.85; // fallback: 15% below avg
    }
  }

  // Trend: compare avg of last 7 days vs prior 7 days
  const trend = await calculateTrend(productId);

  return {
    productId: product.id,
    productName: product.name,
    avgPrice30d: avgPrice ? Math.round(avgPrice * 100) / 100 : null,
    minPrice90d: stats90d?.min ? parseFloat(stats90d.min) : null,
    maxPrice90d: stats90d?.max ? parseFloat(stats90d.max) : null,
    stddev30d: stddev ? Math.round(stddev * 100) / 100 : null,
    priceCount30d: stats30d?.count ?? 0,
    currentPrice,
    currentMarket: latest?.marketName ?? null,
    percentBelowAvg,
    isGoodDeal,
    trend,
  };
}

async function calculateTrend(
  productId: number
): Promise<"rising" | "falling" | "stable" | "unknown"> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [recent] = await db
    .select({ avg: sql<string>`AVG(${prices.price}::numeric)` })
    .from(prices)
    .where(
      and(eq(prices.productId, productId), gte(prices.createdAt, sevenDaysAgo))
    );

  const [prior] = await db
    .select({ avg: sql<string>`AVG(${prices.price}::numeric)` })
    .from(prices)
    .where(
      and(
        eq(prices.productId, productId),
        gte(prices.createdAt, fourteenDaysAgo),
        sql`${prices.createdAt} < ${sevenDaysAgo}`
      )
    );

  if (!recent?.avg || !prior?.avg) return "unknown";

  const recentAvg = parseFloat(recent.avg);
  const priorAvg = parseFloat(prior.avg);
  const change = ((recentAvg - priorAvg) / priorAvg) * 100;

  if (change > 5) return "rising";
  if (change < -5) return "falling";
  return "stable";
}

/**
 * Check if a specific price is a good deal for a product.
 */
export async function isGoodDeal(
  productId: number,
  price: number
): Promise<{ isGood: boolean; percentBelowAvg: number | null; avgPrice: number | null }> {
  const stats = await getProductStats(productId);
  if (!stats || !stats.avgPrice30d) {
    return { isGood: false, percentBelowAvg: null, avgPrice: null };
  }

  const percentBelow =
    Math.round(((stats.avgPrice30d - price) / stats.avgPrice30d) * 1000) / 10;

  let isGood = false;
  if (stats.stddev30d && stats.stddev30d > 0) {
    isGood = price < stats.avgPrice30d - stats.stddev30d;
  } else {
    isGood = price < stats.avgPrice30d * 0.85;
  }

  return { isGood, percentBelowAvg: percentBelow, avgPrice: stats.avgPrice30d };
}

/**
 * Get the best (lowest) current price for a product across all markets.
 * Only considers prices from the last 7 days.
 */
export async function getBestPrice(productId: number) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await db
    .select({
      price: prices.price,
      marketName: markets.name,
      marketId: prices.marketId,
      source: prices.source,
      priceType: prices.priceType,
      normalizedPrice: prices.normalizedPrice,
      normalizedUnit: prices.normalizedUnit,
      createdAt: prices.createdAt,
    })
    .from(prices)
    .innerJoin(markets, eq(prices.marketId, markets.id))
    .where(
      and(eq(prices.productId, productId), gte(prices.createdAt, sevenDaysAgo))
    )
    .orderBy(sql`${prices.price}::numeric ASC`)
    .limit(1);

  return result[0] ?? null;
}
