import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prices, products, markets } from "@/db/schema";
import { eq, desc, gte } from "drizzle-orm";
import { sanitize, positiveNumber, positiveInt } from "@/lib/validation";

// POST /api/prices — salvar preços extraídos de promoções
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Suporta array ou objeto único
    const items = Array.isArray(body) ? body : [body];

    if (items.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 items per request" },
        { status: 400 }
      );
    }

    const results = [];
    for (const item of items) {
      const price = positiveNumber(item.price);
      const source = item.source === "receipt" ? "receipt" : "promo";

      let pId = positiveInt(item.productId);
      let mId = positiveInt(item.marketId);

      const productName = sanitize(item.productName);
      const marketName = sanitize(item.marketName);

      // Se mandou nome ao invés de ID, criar/buscar
      if (!pId && productName) {
        const existing = await db
          .select()
          .from(products)
          .where(eq(products.name, productName))
          .limit(1);
        if (existing.length > 0) {
          pId = existing[0].id;
        } else {
          const [newProduct] = await db
            .insert(products)
            .values({
              name: productName,
              brand: sanitize(item.brand) || null,
              category: sanitize(item.category) || null,
              unit: sanitize(item.unit) || null,
            })
            .returning();
          pId = newProduct.id;
        }
      }

      if (!mId && marketName) {
        const existing = await db
          .select()
          .from(markets)
          .where(eq(markets.name, marketName))
          .limit(1);
        if (existing.length > 0) {
          mId = existing[0].id;
        } else {
          const [newMarket] = await db
            .insert(markets)
            .values({ name: marketName })
            .returning();
          mId = newMarket.id;
        }
      }

      if (!pId || !mId || !price) {
        results.push({ error: "Missing productId/marketId/price", item });
        continue;
      }

      let promoValidUntil: Date | null = null;
      if (item.promoValidUntil) {
        const d = new Date(item.promoValidUntil);
        if (!isNaN(d.getTime())) {
          promoValidUntil = d;
        }
      }

      const [inserted] = await db
        .insert(prices)
        .values({
          productId: pId,
          marketId: mId,
          price: String(price),
          source,
          promoValidUntil,
        })
        .returning();

      results.push(inserted);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error saving prices:", error);
    return NextResponse.json(
      { error: "Failed to save prices" },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
