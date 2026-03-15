import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, prices, markets } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

// GET /api/products — listar produtos com último preço por mercado
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        category: products.category,
        unit: products.unit,
        createdAt: products.createdAt,
      })
      .from(products)
      .orderBy(products.name)
      .limit(limit);

    const allProducts = await query;

    // Para cada produto, buscar o melhor preço atual
    const enriched = await Promise.all(
      allProducts.map(async (product) => {
        const latestPrices = await db
          .select({
            price: prices.price,
            marketName: markets.name,
            marketId: markets.id,
            source: prices.source,
            createdAt: prices.createdAt,
          })
          .from(prices)
          .innerJoin(markets, eq(prices.marketId, markets.id))
          .where(eq(prices.productId, product.id))
          .orderBy(desc(prices.createdAt))
          .limit(6); // um por mercado max

        // Pegar o menor preço
        const bestPrice = latestPrices.length > 0
          ? latestPrices.reduce((min, p) => parseFloat(p.price) < parseFloat(min.price) ? p : min)
          : null;

        return {
          ...product,
          latestPrices,
          bestPrice: bestPrice ? {
            price: bestPrice.price,
            marketName: bestPrice.marketName,
          } : null,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
