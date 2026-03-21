import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { needs, productNeeds, products, prices, markets } from "@/db/schema";
import { eq, desc, gte, and, sql, or, isNull } from "drizzle-orm";
import { getProductStats } from "@/lib/price-analytics";

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
//   ?market=<name>  — filter by market (for "what's worth buying at X?")
//   ?needId=<id>    — filter by specific need
//   ?onlyDeals=true — only return needs that have active deals below target
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const marketFilter = searchParams.get("market");
    const needIdFilter = searchParams.get("needId");
    const onlyDeals = searchParams.get("onlyDeals") === "true";

    // Get active needs
    const needConditions = [eq(needs.active, true)];
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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const results: DealInfo[] = [];

    for (const need of activeNeeds) {
      if (need.alertMode === "never") continue;

      // Get products matched to this need via productNeeds
      const matchedProducts = await db
        .select({
          productId: productNeeds.productId,
          confidence: productNeeds.confidence,
          productName: products.name,
          productBrand: products.brand,
        })
        .from(productNeeds)
        .innerJoin(products, eq(productNeeds.productId, products.id))
        .where(eq(productNeeds.needId, need.id));

      if (matchedProducts.length === 0) continue;

      const deals: DealInfo["deals"] = [];
      const preferred = (need.preferred as string[]) ?? [];
      const targetPrice = need.targetPrice ? parseFloat(need.targetPrice) : null;

      for (const mp of matchedProducts) {
        // Get latest price for this product (last 7 days, active promos only)
        const priceConditions = [
          eq(prices.productId, mp.productId),
          gte(prices.createdAt, sevenDaysAgo),
        ];

        // Only active promos (not expired) + receipts
        priceConditions.push(
          or(
            isNull(prices.promoValidUntil),
            gte(prices.promoValidUntil, new Date()),
            eq(prices.source, "receipt")
          )!
        );

        const latestPrices = await db
          .select({
            price: prices.price,
            marketName: markets.name,
            source: prices.source,
            priceType: prices.priceType,
            normalizedPrice: prices.normalizedPrice,
            normalizedUnit: prices.normalizedUnit,
            promoValidUntil: prices.promoValidUntil,
            createdAt: prices.createdAt,
          })
          .from(prices)
          .innerJoin(markets, eq(prices.marketId, markets.id))
          .where(and(...priceConditions))
          .orderBy(sql`${prices.price}::numeric ASC`)
          .limit(5);

        for (const lp of latestPrices) {
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
          const isPreferred = preferred.some(
            (p) => mp.productBrand?.toLowerCase().includes(p.toLowerCase()) ?? false
          );

          // Get analytics
          const stats = await getProductStats(mp.productId);

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
            isPreferred,
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
