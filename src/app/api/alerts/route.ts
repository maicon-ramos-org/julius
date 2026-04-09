import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { needs, productNeeds, products, prices, markets } from "@/db/schema";
import { eq, desc, gte, and, sql, or, isNull, inArray } from "drizzle-orm";
import { getProductStats } from "@/lib/price-analytics";
import { isBrandExcluded, isBrandPreferred } from "@/lib/brand-preference";

interface DealInfo {
  needId: number;
  needName: string;
  needCategory: string | null;
  targetPrice: number | null;
  targetUnit: string | null;
  alertMode: string;
  preferred: string[];
  deals: {
    productId: number;
    productName: string;
    productBrand: string | null;
    confidence: number;
    currentPrice: number;
    marketName: string;
    source: string;
    priceType: string;
    normalizedPrice: number | null;
    normalizedUnit: string | null;
    promoValidUntil: Date | null;
    pricedAt: Date;
    // Analytics
    avgPrice30d: number | null;
    percentBelowAvg: number | null;
    isGoodDeal: boolean;
    isBelowTarget: boolean;
    isPreferred: boolean;
  }[];
}

// GET /api/alerts — deals that match user needs
// Query params:
//   ?market=<name>  — filter by market
//   ?needId=<id>    — filter by specific need
//   ?onlyDeals=true — only return needs that have active deals below target
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const marketFilter = searchParams.get("market");
    const needIdFilter = searchParams.get("needId");
    const onlyDeals = searchParams.get("onlyDeals") === "true";

    // 1. Get ALL active needs in ONE query
    const needConditions: ReturnType<typeof eq>[] = [eq(needs.active, true)];
    if (needIdFilter) {
      needConditions.push(eq(needs.id, parseInt(needIdFilter)));
    }

    const activeNeeds = await db
      .select()
      .from(needs)
      .where(and(...needConditions));

    if (activeNeeds.length === 0) {
      return NextResponse.json([]);
    }

    const needIds = activeNeeds.map((n) => n.id);

    // 2. Get ALL matched products for ALL needs in ONE query with JOIN
    const allMatchedProducts = await db
      .select({
        productId: productNeeds.productId,
        needId: productNeeds.needId,
        confidence: productNeeds.confidence,
        productName: products.name,
        productBrand: products.brand,
      })
      .from(productNeeds)
      .innerJoin(products, eq(productNeeds.productId, products.id))
      .where(inArray(productNeeds.needId, needIds));

    if (allMatchedProducts.length === 0) {
      return NextResponse.json([]);
    }

    const productIds = [...new Set(allMatchedProducts.map((p) => p.productId))];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 3. Get ALL latest prices for ALL matched products in ONE query
    // Include only promo source OR receipts, and filter by validity
    const allPricesRaw = await db
      .select({
        price: prices.price,
        productId: prices.productId,
        marketName: markets.name,
        marketId: markets.id,
        source: prices.source,
        priceType: prices.priceType,
        normalizedPrice: prices.normalizedPrice,
        normalizedUnit: prices.normalizedUnit,
        promoValidUntil: prices.promoValidUntil,
        createdAt: prices.createdAt,
      })
      .from(prices)
      .innerJoin(markets, eq(prices.marketId, markets.id))
      .where(
        and(
          inArray(prices.productId, productIds),
          gte(prices.createdAt, sevenDaysAgo),
          // Only promos with future validity OR receipts
          or(
            and(
              sql`${prices.promoValidUntil} IS NOT NULL`,
              gte(prices.promoValidUntil, new Date())
            ),
            eq(prices.source, "receipt")
          )
        )
      );

    // 4. Pre-compute stats for ALL products in batch (single call per product)
    const statsCache = new Map<number, Awaited<ReturnType<typeof getProductStats>>>();
    await Promise.all(
      productIds.map(async (pid) => {
        statsCache.set(pid, await getProductStats(pid));
      })
    );

    // 5. Group matched products by needId
    const productsByNeed = new Map<number, typeof allMatchedProducts>();
    for (const mp of allMatchedProducts) {
      if (!productsByNeed.has(mp.needId)) {
        productsByNeed.set(mp.needId, []);
      }
      productsByNeed.get(mp.needId)!.push(mp);
    }

    // 6. Build results
    const results: DealInfo[] = [];

    for (const need of activeNeeds) {
      if (need.alertMode === "never") continue;

      const matchedProducts = productsByNeed.get(need.id) ?? [];
      if (matchedProducts.length === 0) continue;

      const deals: DealInfo["deals"] = [];
      const preferred = (need.preferred as string[]) ?? [];
      const targetPrice = need.targetPrice ? parseFloat(need.targetPrice) : null;

      for (const mp of matchedProducts) {
        // Filter prices for this product
        const productPrices = allPricesRaw.filter((p) => p.productId === mp.productId);

        for (const lp of productPrices) {
          // Market filter
          if (marketFilter) {
            const marketLower = lp.marketName.toLowerCase().trim();
            const filterLower = marketFilter.toLowerCase().trim();
            if (!marketLower.includes(filterLower) && !filterLower.includes(marketLower)) {
              continue;
            }
          }

          const currentPrice = parseFloat(lp.price);
          const isBelowTarget = targetPrice ? currentPrice <= targetPrice : false;

          // Intelligent brand preference matching
          // If brand is excluded (e.g. "exceto Bavaria"), skip it entirely
          const brandExcluded = isBrandExcluded(mp.productBrand, preferred);
          if (brandExcluded) continue;

          // isPreferred: brand is explicitly liked (matches preferred list)
          const preferred2 = isBrandPreferred(mp.productBrand, preferred);

          // Use pre-computed stats from cache
          const stats = statsCache.get(mp.productId);

          // For "below_target" mode, only include if below target
          if (need.alertMode === "below_target" && !isBelowTarget) continue;

          deals.push({
            productId: mp.productId,
            productName: mp.productName,
            productBrand: mp.productBrand,
            confidence: mp.confidence ? parseFloat(mp.confidence) : 1,
            currentPrice,
            marketName: lp.marketName,
            source: lp.source,
            priceType: lp.priceType,
            normalizedPrice: lp.normalizedPrice ? parseFloat(lp.normalizedPrice) : null,
            normalizedUnit: lp.normalizedUnit,
            promoValidUntil: lp.promoValidUntil,
            pricedAt: lp.createdAt,
            avgPrice30d: stats?.avgPrice30d ?? null,
            percentBelowAvg: stats?.percentBelowAvg ?? null,
            isGoodDeal: stats?.isGoodDeal ?? false,
            isBelowTarget,
            isPreferred: preferred2,
          });
        }
      }

      // Sort deals: preferred first, then by price ascending
      deals.sort((a, b) => {
        if (a.isPreferred && !b.isPreferred) return -1;
        if (!a.isPreferred && b.isPreferred) return 1;
        return a.currentPrice - b.currentPrice;
      });

      if (onlyDeals && deals.length === 0) continue;

      results.push({
        needId: need.id,
        needName: need.name,
        needCategory: need.category,
        targetPrice,
        targetUnit: need.targetUnit,
        alertMode: need.alertMode,
        preferred,
        deals,
      });
    }

    // Sort: needs with deals first, then by deal count
    results.sort((a, b) => {
      if (a.deals.length > 0 && b.deals.length === 0) return -1;
      if (a.deals.length === 0 && b.deals.length > 0) return 1;
      return b.deals.length - a.deals.length;
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
