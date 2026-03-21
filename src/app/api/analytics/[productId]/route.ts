import { NextRequest, NextResponse } from "next/server";
import { getProductStats, getBestPrice } from "@/lib/price-analytics";
import { db } from "@/db";
import { productNeeds, needs } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/analytics/[productId] — detailed price analytics for a product
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId: productIdStr } = await params;
    const productId = parseInt(productIdStr);

    if (isNaN(productId) || productId <= 0) {
      return NextResponse.json(
        { error: "Invalid productId" },
        { status: 400 }
      );
    }

    const [stats, bestPrice, matchedNeeds] = await Promise.all([
      getProductStats(productId),
      getBestPrice(productId),
      db
        .select({
          needId: needs.id,
          needName: needs.name,
          confidence: productNeeds.confidence,
          targetPrice: needs.targetPrice,
          targetUnit: needs.targetUnit,
        })
        .from(productNeeds)
        .innerJoin(needs, eq(productNeeds.needId, needs.id))
        .where(eq(productNeeds.productId, productId)),
    ]);

    if (!stats) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...stats,
      bestPrice,
      matchedNeeds,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
