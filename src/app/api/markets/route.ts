import { NextResponse } from "next/server";
import { db } from "@/db";
import { markets, prices, products, receipts } from "@/db/schema";
import { eq, sql, gte, and, desc } from "drizzle-orm";

// GET /api/markets — list markets with stats
export async function GET() {
  try {
    const allMarkets = await db
      .select()
      .from(markets)
      .orderBy(markets.name);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Batch: promo count per market (7d)
    const promoCounts = await db
      .select({
        marketId: prices.marketId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(prices)
      .where(gte(prices.createdAt, sevenDaysAgo))
      .groupBy(prices.marketId);

    const promoMap: Record<number, number> = {};
    for (const pc of promoCounts) {
      promoMap[pc.marketId] = pc.count;
    }

    // Batch: distinct products per market
    const productCounts = await db
      .select({
        marketId: prices.marketId,
        count: sql<number>`COUNT(DISTINCT ${prices.productId})::int`,
      })
      .from(prices)
      .groupBy(prices.marketId);

    const productMap: Record<number, number> = {};
    for (const pc of productCounts) {
      productMap[pc.marketId] = pc.count;
    }

    // Batch: total spent per market (30d)
    const spendingData = await db
      .select({
        marketId: receipts.marketId,
        total: sql<string>`SUM(${receipts.total}::numeric)`,
      })
      .from(receipts)
      .where(gte(receipts.date, thirtyDaysAgo.toISOString().split("T")[0]))
      .groupBy(receipts.marketId);

    const spendingMap: Record<number, number> = {};
    for (const s of spendingData) {
      spendingMap[s.marketId] = s.total ? parseFloat(s.total) : 0;
    }

    // Batch: cheapest product per market (for display)
    const cheapestByMarket = await db
      .select({
        marketId: prices.marketId,
        productName: products.name,
        price: prices.price,
      })
      .from(prices)
      .innerJoin(products, eq(prices.productId, products.id))
      .where(gte(prices.createdAt, sevenDaysAgo))
      .orderBy(sql`${prices.price}::numeric ASC`);

    const cheapestMap: Record<number, { productName: string; price: string }> = {};
    for (const c of cheapestByMarket) {
      if (!cheapestMap[c.marketId]) {
        cheapestMap[c.marketId] = { productName: c.productName, price: c.price };
      }
    }

    const enriched = allMarkets.map((market) => ({
      id: market.id,
      name: market.name,
      phone: market.phone,
      hasLoyalty: market.hasLoyalty,
      loyaltyProgram: market.loyaltyProgram,
      stats: {
        productsTracked: productMap[market.id] || 0,
        recentPromos7d: promoMap[market.id] || 0,
        totalSpent30d: spendingMap[market.id] || 0,
        cheapestItem: cheapestMap[market.id] || null,
      },
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching markets:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}
