import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { needs, productNeeds, products, prices, markets } from "@/db/schema";
import { eq, desc, gte, and, or, isNull, sql } from "drizzle-orm";
import { getProductStats } from "@/lib/price-analytics";

interface DealNotification {
  needName: string;
  needCategory: string | null;
  targetPrice: number | null;
  productName: string;
  productBrand: string | null;
  currentPrice: number;
  marketName: string;
  source: string;
  priceType: string;
  promoValidUntil: string | null;
  avgPrice30d: number | null;
  percentBelowAvg: number | null;
  isGoodDeal: boolean;
  isBelowTarget: boolean;
  // Pre-formatted message for Telegram/WhatsApp
  message: string;
}

/**
 * GET /api/webhooks/notify — Returns current deals for n8n to poll
 * POST /api/webhooks/notify — Checks deals and forwards to WEBHOOK_ALERTS_URL
 *
 * Both return the same deal payload.
 * n8n can either:
 *   1. Poll this GET endpoint on a schedule
 *   2. Call POST to trigger forwarding to WEBHOOK_ALERTS_URL
 */

async function getDeals(): Promise<DealNotification[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeNeeds = await db
    .select()
    .from(needs)
    .where(eq(needs.active, true));

  const notifications: DealNotification[] = [];

  for (const need of activeNeeds) {
    if (need.alertMode === "never") continue;

    const matchedProducts = await db
      .select({
        productId: productNeeds.productId,
        productName: products.name,
        productBrand: products.brand,
      })
      .from(productNeeds)
      .innerJoin(products, eq(productNeeds.productId, products.id))
      .where(eq(productNeeds.needId, need.id));

    const targetPrice = need.targetPrice ? parseFloat(need.targetPrice) : null;

    for (const mp of matchedProducts) {
      const [latestPrice] = await db
        .select({
          price: prices.price,
          marketName: markets.name,
          source: prices.source,
          priceType: prices.priceType,
          promoValidUntil: prices.promoValidUntil,
        })
        .from(prices)
        .innerJoin(markets, eq(prices.marketId, markets.id))
        .where(
          and(
            eq(prices.productId, mp.productId),
            gte(prices.createdAt, sevenDaysAgo),
            or(
              isNull(prices.promoValidUntil),
              gte(prices.promoValidUntil, new Date())
            )
          )
        )
        .orderBy(sql`${prices.price}::numeric ASC`)
        .limit(1);

      if (!latestPrice) continue;

      const currentPrice = parseFloat(latestPrice.price);
      const isBelowTarget = targetPrice ? currentPrice <= targetPrice : false;

      // For below_target mode, skip if not below target
      if (need.alertMode === "below_target" && !isBelowTarget) continue;

      const stats = await getProductStats(mp.productId);
      const percentBelowAvg = stats?.percentBelowAvg ?? null;
      const isGoodDeal = stats?.isGoodDeal ?? false;

      // Build human-readable message
      let message = `${mp.productName} por R$ ${currentPrice.toFixed(2)} no ${latestPrice.marketName}`;
      if (isBelowTarget && targetPrice) {
        message += ` (abaixo do alvo de R$ ${targetPrice.toFixed(2)})`;
      }
      if (percentBelowAvg && percentBelowAvg > 0) {
        message += ` — ${percentBelowAvg.toFixed(0)}% abaixo da média`;
      }
      if (isGoodDeal) {
        message += ` 🔥 Preço historicamente baixo!`;
      }
      if (latestPrice.priceType === "loyalty") {
        message += ` (preço cartão fidelidade)`;
      }

      notifications.push({
        needName: need.name,
        needCategory: need.category,
        targetPrice,
        productName: mp.productName,
        productBrand: mp.productBrand,
        currentPrice,
        marketName: latestPrice.marketName,
        source: latestPrice.source,
        priceType: latestPrice.priceType,
        promoValidUntil: latestPrice.promoValidUntil
          ? latestPrice.promoValidUntil.toISOString()
          : null,
        avgPrice30d: stats?.avgPrice30d ?? null,
        percentBelowAvg,
        isGoodDeal,
        isBelowTarget,
        message,
      });
    }
  }

  return notifications.sort((a, b) => {
    // Good deals first, then by % below avg
    if (a.isGoodDeal && !b.isGoodDeal) return -1;
    if (!a.isGoodDeal && b.isGoodDeal) return 1;
    return (b.percentBelowAvg ?? 0) - (a.percentBelowAvg ?? 0);
  });
}

// GET — n8n polls this endpoint
export async function GET() {
  try {
    const deals = await getDeals();

    if (deals.length === 0) {
      return NextResponse.json({
        hasDeals: false,
        count: 0,
        deals: [],
        summary: "Nenhuma oferta relevante no momento.",
      });
    }

    // Build summary message
    const summary = deals
      .map((d) => `• ${d.message}`)
      .join("\n");

    return NextResponse.json({
      hasDeals: true,
      count: deals.length,
      deals,
      summary: `🛒 ${deals.length} oferta(s) encontrada(s):\n\n${summary}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching deals for webhook:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}

// POST — triggers deal check and optionally forwards to WEBHOOK_ALERTS_URL
export async function POST() {
  try {
    const deals = await getDeals();

    const summary = deals.length > 0
      ? `🛒 ${deals.length} oferta(s) encontrada(s):\n\n${deals.map((d) => `• ${d.message}`).join("\n")}`
      : "Nenhuma oferta relevante no momento.";

    const payload = {
      hasDeals: deals.length > 0,
      count: deals.length,
      deals,
      summary,
      timestamp: new Date().toISOString(),
    };

    // Forward to webhook if configured
    const webhookUrl = process.env.WEBHOOK_ALERTS_URL;
    let webhookResult = null;

    if (webhookUrl && deals.length > 0) {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        webhookResult = {
          sent: true,
          status: res.status,
          ok: res.ok,
        };
      } catch (webhookErr) {
        webhookResult = {
          sent: false,
          error: webhookErr instanceof Error ? webhookErr.message : "unknown",
        };
      }
    }

    return NextResponse.json({
      ...payload,
      webhook: webhookResult,
    });
  } catch (error) {
    console.error("Error in notify webhook:", error);
    return NextResponse.json(
      { error: "Failed to process notification" },
      { status: 500 }
    );
  }
}
