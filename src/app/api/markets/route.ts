import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { markets, prices, products, receipts } from "@/db/schema";
import { eq, sql, gte, and, desc } from "drizzle-orm";
import { sanitize } from "@/lib/validation";
import { normalizeText } from "@/lib/normalize";

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

// POST /api/markets — criar mercado
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = sanitize(body.name);

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    // Check uniqueness (normalized)
    const allMarkets = await db.select({ id: markets.id, name: markets.name }).from(markets);
    const normalized = normalizeText(name);
    const duplicate = allMarkets.find((m) => normalizeText(m.name) === normalized);
    if (duplicate) {
      return NextResponse.json(
        { error: `Mercado "${duplicate.name}" já existe` },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(markets)
      .values({
        name,
        phone: sanitize(body.phone) || null,
        loyaltyProgram: sanitize(body.loyaltyProgram) || null,
        hasLoyalty: body.hasLoyalty === true,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating market:", error);
    return NextResponse.json({ error: "Failed to create market" }, { status: 500 });
  }
}

// PUT /api/markets — atualizar mercado
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = sanitize(body.name);
    if (body.phone !== undefined) updateData.phone = sanitize(body.phone) || null;
    if (body.loyaltyProgram !== undefined) updateData.loyaltyProgram = sanitize(body.loyaltyProgram) || null;
    if (body.hasLoyalty !== undefined) updateData.hasLoyalty = body.hasLoyalty === true;

    const [updated] = await db
      .update(markets)
      .set(updateData)
      .where(eq(markets.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Mercado não encontrado" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating market:", error);
    return NextResponse.json({ error: "Failed to update market" }, { status: 500 });
  }
}

// DELETE /api/markets — deletar mercado
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "");
    if (isNaN(id)) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }

    // Check FK dependencies
    const [hasPrice] = await db
      .select({ id: prices.id })
      .from(prices)
      .where(eq(prices.marketId, id))
      .limit(1);

    const [hasReceipt] = await db
      .select({ id: receipts.id })
      .from(receipts)
      .where(eq(receipts.marketId, id))
      .limit(1);

    if (hasPrice || hasReceipt) {
      return NextResponse.json(
        { error: "Mercado possui preços ou notas vinculados. Exclua-os primeiro." },
        { status: 409 }
      );
    }

    await db.delete(markets).where(eq(markets.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting market:", error);
    return NextResponse.json({ error: "Failed to delete market" }, { status: 500 });
  }
}
