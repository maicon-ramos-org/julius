import { NextResponse } from "next/server";
import { db } from "@/db";
import { prices, receipts, products, markets, receiptItems } from "@/db/schema";
import { eq, desc, gte, sql, count } from "drizzle-orm";

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total de produtos
    const [productCount] = await db
      .select({ count: count() })
      .from(products);

    // Total de mercados
    const [marketCount] = await db
      .select({ count: count() })
      .from(markets);

    // Total gasto (últimos 30 dias)
    const recentReceipts = await db
      .select({
        total: receipts.total,
        date: receipts.date,
        marketName: markets.name,
      })
      .from(receipts)
      .innerJoin(markets, eq(receipts.marketId, markets.id))
      .where(gte(receipts.createdAt, thirtyDaysAgo))
      .orderBy(desc(receipts.date));

    const totalSpent = recentReceipts.reduce((sum, r) => sum + parseFloat(r.total), 0);

    // Promoções ativas (últimos 7 dias)
    const [promoCount] = await db
      .select({ count: count() })
      .from(prices)
      .where(gte(prices.createdAt, sevenDaysAgo));

    // Gastos por mercado (últimos 30 dias)
    const spendingByMarket = await db
      .select({
        marketName: markets.name,
        total: sql<string>`SUM(${receipts.total}::numeric)`,
        count: count(),
      })
      .from(receipts)
      .innerJoin(markets, eq(receipts.marketId, markets.id))
      .where(gte(receipts.createdAt, thirtyDaysAgo))
      .groupBy(markets.name);

    // Últimos preços registrados
    const latestPrices = await db
      .select({
        productName: products.name,
        marketName: markets.name,
        price: prices.price,
        source: prices.source,
        createdAt: prices.createdAt,
      })
      .from(prices)
      .innerJoin(products, eq(prices.productId, products.id))
      .innerJoin(markets, eq(prices.marketId, markets.id))
      .orderBy(desc(prices.createdAt))
      .limit(10);

    return NextResponse.json({
      stats: {
        totalProducts: productCount.count,
        totalMarkets: marketCount.count,
        totalSpent30d: totalSpent.toFixed(2),
        activePromos7d: promoCount.count,
      },
      spendingByMarket,
      recentReceipts: recentReceipts.slice(0, 10),
      latestPrices,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
