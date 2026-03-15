import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prices, products, markets } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

// POST /api/prices — salvar preços extraídos de promoções
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Suporta array ou objeto único
    const items = Array.isArray(body) ? body : [body];

    const results = [];
    for (const item of items) {
      const { productId, marketId, price, source = "promo", promoValidUntil, productName, marketName, brand, category, unit } = item;

      let pId = productId;
      let mId = marketId;

      // Se mandou nome ao invés de ID, criar/buscar
      if (!pId && productName) {
        const existing = await db.select().from(products).where(eq(products.name, productName)).limit(1);
        if (existing.length > 0) {
          pId = existing[0].id;
        } else {
          const [newProduct] = await db.insert(products).values({
            name: productName,
            brand: brand || null,
            category: category || null,
            unit: unit || null,
          }).returning();
          pId = newProduct.id;
        }
      }

      if (!mId && marketName) {
        const existing = await db.select().from(markets).where(eq(markets.name, marketName)).limit(1);
        if (existing.length > 0) {
          mId = existing[0].id;
        } else {
          const [newMarket] = await db.insert(markets).values({ name: marketName }).returning();
          mId = newMarket.id;
        }
      }

      if (!pId || !mId || !price) {
        results.push({ error: "Missing productId/marketId/price", item });
        continue;
      }

      const [inserted] = await db.insert(prices).values({
        productId: pId,
        marketId: mId,
        price: String(price),
        source,
        promoValidUntil: promoValidUntil ? new Date(promoValidUntil) : null,
      }).returning();

      results.push(inserted);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error saving prices:", error);
    return NextResponse.json({ error: "Failed to save prices" }, { status: 500 });
  }
}

// GET /api/prices — listar promoções recentes (últimos 7 dias)
export async function GET() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPrices = await db
      .select({
        id: prices.id,
        price: prices.price,
        source: prices.source,
        promoValidUntil: prices.promoValidUntil,
        createdAt: prices.createdAt,
        productName: products.name,
        productBrand: products.brand,
        productCategory: products.category,
        productUnit: products.unit,
        marketName: markets.name,
      })
      .from(prices)
      .innerJoin(products, eq(prices.productId, products.id))
      .innerJoin(markets, eq(prices.marketId, markets.id))
      .where(gte(prices.createdAt, sevenDaysAgo))
      .orderBy(desc(prices.createdAt))
      .limit(100);

    return NextResponse.json(recentPrices);
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
