import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prices, markets, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const pid = parseInt(productId);

    if (isNaN(pid)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }

    // Buscar info do produto
    const [product] = await db.select().from(products).where(eq(products.id, pid)).limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Buscar histórico de preços
    const history = await db
      .select({
        id: prices.id,
        price: prices.price,
        source: prices.source,
        priceType: prices.priceType,
        normalizedPrice: prices.normalizedPrice,
        normalizedUnit: prices.normalizedUnit,
        promoValidUntil: prices.promoValidUntil,
        createdAt: prices.createdAt,
        marketName: markets.name,
        marketLogoUrl: markets.logoUrl,
        marketId: markets.id,
      })
      .from(prices)
      .innerJoin(markets, eq(prices.marketId, markets.id))
      .where(eq(prices.productId, pid))
      .orderBy(desc(prices.createdAt))
      .limit(200);

    return NextResponse.json({ product, history });
  } catch (error) {
    console.error("Error fetching price history:", error);
    return NextResponse.json({ error: "Failed to fetch price history" }, { status: 500 });
  }
}
