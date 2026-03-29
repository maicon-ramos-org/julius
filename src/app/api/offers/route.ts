import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prices, products, markets } from "@/db/schema";
import { eq, desc, gte, and, sql, or, isNull } from "drizzle-orm";

// GET /api/offers — promoções válidas com critério de validade
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const market = searchParams.get("market");
    const category = searchParams.get("category");

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Build conditions
    const conditions = [
      // Only promo source
      eq(prices.source, "promo"),
      // Valid promos: either has valid_until in future OR null and created within 7 days
      or(
        and(
          sql`${prices.promoValidUntil} IS NOT NULL`,
          gte(prices.promoValidUntil, now)
        ),
        and(
          isNull(prices.promoValidUntil),
          gte(prices.createdAt, sevenDaysAgo)
        )
      ),
    ];

    if (market) {
      conditions.push(sql`LOWER(${markets.name}) = LOWER(${market})`);
    }

    if (category) {
      conditions.push(sql`LOWER(${products.category}) = LOWER(${category})`);
    }

    // Get all valid offers
    const allOffers = await db
      .select({
        id: prices.id,
        productId: prices.productId,
        productName: products.name,
        productBrand: products.brand,
        productCategory: products.category,
        marketName: markets.name,
        marketLogoUrl: markets.logoUrl,
        price: prices.price,
        priceType: prices.priceType,
        promoValidUntil: prices.promoValidUntil,
        createdAt: prices.createdAt,
      })
      .from(prices)
      .innerJoin(products, eq(prices.productId, products.id))
      .innerJoin(markets, eq(prices.marketId, markets.id))
      .where(and(...conditions))
      .orderBy(desc(prices.createdAt));

    // Group by product and get the best (lowest) price per product
    const productMap = new Map<number, typeof allOffers[0]>();

    for (const offer of allOffers) {
      const existing = productMap.get(offer.productId);
      if (!existing || parseFloat(offer.price) < parseFloat(existing.price)) {
        productMap.set(offer.productId, offer);
      }
    }

    const offers = Array.from(productMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    return NextResponse.json(
      { error: "Failed to fetch offers" },
      { status: 500 }
    );
  }
}