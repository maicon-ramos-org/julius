import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, prices, markets } from "@/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

// GET /api/products — listar produtos com melhor preço (single query, no N+1)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Subquery: best price per product in last 7 days
    const bestPriceSub = db
      .select({
        productId: prices.productId,
        minPrice: sql<string>`MIN(${prices.price}::numeric)`.as("min_price"),
      })
      .from(prices)
      .where(gte(prices.createdAt, sevenDaysAgo))
      .groupBy(prices.productId)
      .as("best_price");

    // Build conditions
    const conditions = [];
    if (search) {
      conditions.push(
        sql`(LOWER(${products.name}) LIKE LOWER(${"%" + search + "%"}) OR LOWER(${products.brand}) LIKE LOWER(${"%" + search + "%"}))`
      );
    }
    if (category) {
      conditions.push(
        sql`LOWER(${products.category}) = LOWER(${category})`
      );
    }

    // Main query: products LEFT JOIN best price
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        category: products.category,
        unit: products.unit,
        unitType: products.unitType,
        unitQuantity: products.unitQuantity,
        createdAt: products.createdAt,
        bestPrice: bestPriceSub.minPrice,
      })
      .from(products)
      .leftJoin(bestPriceSub, eq(products.id, bestPriceSub.productId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(products.name)
      .limit(limit);

    // For products with a best price, get which market has it (single batch query)
    const productIds = allProducts
      .filter((p) => p.bestPrice !== null)
      .map((p) => p.id);

    let priceMarketMap: Record<number, { marketName: string; source: string }> = {};

    if (productIds.length > 0) {
      const priceDetails = await db
        .select({
          productId: prices.productId,
          price: prices.price,
          marketName: markets.name,
          source: prices.source,
        })
        .from(prices)
        .innerJoin(markets, eq(prices.marketId, markets.id))
        .where(
          and(
            sql`${prices.productId} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`,
            gte(prices.createdAt, sevenDaysAgo)
          )
        )
        .orderBy(sql`${prices.price}::numeric ASC`);

      // Keep only the first (cheapest) per product
      for (const pd of priceDetails) {
        if (!priceMarketMap[pd.productId]) {
          priceMarketMap[pd.productId] = {
            marketName: pd.marketName,
            source: pd.source,
          };
        }
      }
    }

    const enriched = allProducts.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      unit: product.unit,
      unitType: product.unitType,
      unitQuantity: product.unitQuantity,
      createdAt: product.createdAt,
      bestPrice: product.bestPrice
        ? {
            price: product.bestPrice,
            marketName: priceMarketMap[product.id]?.marketName || null,
            source: priceMarketMap[product.id]?.source || null,
          }
        : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
