import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prices, products, markets, productNeeds, needs } from "@/db/schema";
import { eq, desc, gte, and, sql, inArray } from "drizzle-orm";

// GET /api/offers — promoções válidas com critério de validade
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const market = searchParams.get("market");
    const category = searchParams.get("category");
    const onlyNeeds = searchParams.get("onlyNeeds") === "true";

    const now = new Date();

    // Build conditions
    const conditions = [
      // Only promo source
      eq(prices.source, "promo"),
      // ONLY promos with explicit future validity date (from encarte)
      and(
        sql`${prices.promoValidUntil} IS NOT NULL`,
        gte(prices.promoValidUntil, now)
      ) as ReturnType<typeof eq>,
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

    // If onlyNeeds=true, filter to products that match at least one active need
    if (onlyNeeds) {
      const productIds = offers.map((o) => o.productId);
      if (productIds.length > 0) {
        const matched = await db
          .select({ productId: productNeeds.productId })
          .from(productNeeds)
          .innerJoin(needs, eq(productNeeds.needId, needs.id))
          .where(
            and(
              inArray(productNeeds.productId, productIds),
              eq(needs.active, true)
            )
          );
        const matchedIds = new Set(matched.map((m) => m.productId));
        return NextResponse.json(offers.filter((o) => matchedIds.has(o.productId)));
      }
      return NextResponse.json([]);
    }

    return NextResponse.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    return NextResponse.json(
      { error: "Failed to fetch offers" },
      { status: 500 }
    );
  }
}
