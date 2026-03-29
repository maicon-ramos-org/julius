import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prices, products, markets } from "@/db/schema";
import { eq, desc, gte, and, sql, or, isNull } from "drizzle-orm";
import { sanitize, positiveNumber, positiveInt } from "@/lib/validation";
import { matchAndPersist } from "@/lib/match-engine";
import { findOrCreateMarket } from "@/lib/market-lookup";
import { createInsertionLog } from "@/app/api/logs/route";

// Calculate normalized price per base unit (kg, L, or un)
function calcNormalized(
  price: number,
  unitType: string | null,
  unitQuantity: number | null
): { normalizedPrice: string; normalizedUnit: string } | null {
  if (!unitType || !unitQuantity || unitQuantity <= 0) return null;

  let normalizedPrice: number;
  let normalizedUnit: string;

  switch (unitType) {
    case "kg":
      normalizedPrice = price / unitQuantity;
      normalizedUnit = "kg";
      break;
    case "g":
      normalizedPrice = (price / unitQuantity) * 1000;
      normalizedUnit = "kg";
      break;
    case "L":
      normalizedPrice = price / unitQuantity;
      normalizedUnit = "L";
      break;
    case "mL":
      normalizedPrice = (price / unitQuantity) * 1000;
      normalizedUnit = "L";
      break;
    case "un":
      normalizedPrice = price / unitQuantity;
      normalizedUnit = "un";
      break;
    default:
      return null;
  }

  return {
    normalizedPrice: normalizedPrice.toFixed(4),
    normalizedUnit,
  };
}

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
      const priceType = ["regular", "loyalty", "bulk"].includes(item.priceType)
        ? item.priceType
        : "regular";

      let pId = positiveInt(item.productId);
      let mId = positiveInt(item.marketId);

      const productName = sanitize(item.productName);
      const marketName = sanitize(item.marketName);

      const itemUnitType = sanitize(item.unitType);
      const itemUnitQuantity = positiveNumber(item.unitQuantity);

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
              unitType: itemUnitType || null,
              unitQuantity: itemUnitQuantity ? String(itemUnitQuantity) : null,
            })
            .returning();
          pId = newProduct.id;
        }
      }

      // Market lookup with accent/whitespace normalization
      if (!mId && marketName) {
        mId = await findOrCreateMarket(marketName);
      }

      if (!pId || !mId || !price) {
        results.push({ error: "Missing productId/marketId/price", item });
        continue;
      }

      // Update product unitType/unitQuantity if provided and product didn't have them
      if (itemUnitType && itemUnitQuantity) {
        const [existingProduct] = await db
          .select({ unitType: products.unitType, unitQuantity: products.unitQuantity })
          .from(products)
          .where(eq(products.id, pId))
          .limit(1);
        if (existingProduct && !existingProduct.unitType) {
          await db
            .update(products)
            .set({
              unitType: itemUnitType,
              unitQuantity: String(itemUnitQuantity),
            })
            .where(eq(products.id, pId));
        }
      }

      let promoValidUntil: Date | null = null;
      if (item.promoValidUntil) {
        const d = new Date(item.promoValidUntil);
        if (!isNaN(d.getTime())) {
          promoValidUntil = d;
        }
      }

      // Dedup: check if same (productId, marketId, price, priceType) exists in last 24h
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const [duplicate] = await db
        .select()
        .from(prices)
        .where(
          and(
            eq(prices.productId, pId),
            eq(prices.marketId, mId),
            eq(prices.price, String(price)),
            eq(prices.priceType, priceType),
            gte(prices.createdAt, oneDayAgo)
          )
        )
        .limit(1);

      if (duplicate) {
        results.push({ ...duplicate, _deduplicated: true });
        continue;
      }

      // Resolve unitType/unitQuantity for normalized price calculation
      let effectiveUnitType = itemUnitType;
      let effectiveUnitQuantity = itemUnitQuantity;
      if (!effectiveUnitType || !effectiveUnitQuantity) {
        const [prod] = await db
          .select({ unitType: products.unitType, unitQuantity: products.unitQuantity })
          .from(products)
          .where(eq(products.id, pId))
          .limit(1);
        if (prod) {
          effectiveUnitType = effectiveUnitType || prod.unitType;
          effectiveUnitQuantity =
            effectiveUnitQuantity || (prod.unitQuantity ? parseFloat(prod.unitQuantity) : null);
        }
      }

      const normalized = calcNormalized(price, effectiveUnitType, effectiveUnitQuantity);

      const [inserted] = await db
        .insert(prices)
        .values({
          productId: pId,
          marketId: mId,
          price: String(price),
          source,
          priceType,
          normalizedPrice: normalized?.normalizedPrice || null,
          normalizedUnit: normalized?.normalizedUnit || null,
          promoValidUntil,
        })
        .returning();

      // Run matching against active needs
      try {
        const productName = (await db
          .select({ name: products.name })
          .from(products)
          .where(eq(products.id, pId))
          .limit(1))[0]?.name;
        if (productName) {
          await matchAndPersist(pId, productName);
        }
      } catch (matchErr) {
        console.error("Match engine error (non-blocking):", matchErr);
      }

      results.push(inserted);
    }

    // Create insertion log
    const successfulInserts = results.filter(r => !r.error && !r._deduplicated);
    if (successfulInserts.length > 0) {
      const marketNames = [...new Set(items.map(item => item.marketName).filter(Boolean))];
      const sources = [...new Set(items.map(item => item.source === "receipt" ? "receipt" : "promo"))];

      const summary = `${successfulInserts.length} preço${successfulInserts.length > 1 ? 's' : ''} inserido${successfulInserts.length > 1 ? 's' : ''}${marketNames.length > 0 ? ` - ${marketNames.join(', ')}` : ''}`;

      const firstPromoValidUntil = items.find(item => item.promoValidUntil)?.promoValidUntil;
      let validUntil: Date | null = null;
      if (firstPromoValidUntil) {
        const d = new Date(firstPromoValidUntil);
        if (!isNaN(d.getTime())) {
          validUntil = d;
        }
      }

      await createInsertionLog({
        action: "price_insert",
        source: sources.includes("receipt") ? "receipt_scan" : "promo_scan",
        marketName: marketNames.length === 1 ? marketNames[0] : null,
        summary,
        details: {
          insertedPrices: successfulInserts,
          totalRequested: items.length,
          duplicates: results.filter(r => r._deduplicated).length,
          errors: results.filter(r => r.error).length,
        },
        itemCount: successfulInserts.length,
        promoValidUntil: validUntil,
      });
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
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const conditions = [gte(prices.createdAt, sevenDaysAgo)];

    // Filter: only active promos (not expired) + receipts (always valid history)
    if (activeOnly) {
      conditions.push(
        or(
          isNull(prices.promoValidUntil),
          gte(prices.promoValidUntil, new Date()),
          eq(prices.source, "receipt")
        )!
      );
    }

    const recentPrices = await db
      .select({
        id: prices.id,
        price: prices.price,
        source: prices.source,
        priceType: prices.priceType,
        normalizedPrice: prices.normalizedPrice,
        normalizedUnit: prices.normalizedUnit,
        promoValidUntil: prices.promoValidUntil,
        createdAt: prices.createdAt,
        productName: products.name,
        productBrand: products.brand,
        productCategory: products.category,
        productUnit: products.unit,
        marketName: markets.name,
        marketLogoUrl: markets.logoUrl,
      })
      .from(prices)
      .innerJoin(products, eq(prices.productId, products.id))
      .innerJoin(markets, eq(prices.marketId, markets.id))
      .where(and(...conditions))
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

// DELETE /api/prices — deletar um registro de preço
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "");
    if (isNaN(id)) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }

    await db.delete(prices).where(eq(prices.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting price:", error);
    return NextResponse.json({ error: "Failed to delete price" }, { status: 500 });
  }
}
