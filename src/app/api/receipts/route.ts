import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { receipts, receiptItems, products, markets, prices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// POST /api/receipts — salvar nota fiscal processada
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { marketId, marketName, total, date, imageUrl, items } = body;

    let mId = marketId;
    if (!mId && marketName) {
      const existing = await db.select().from(markets).where(eq(markets.name, marketName)).limit(1);
      if (existing.length > 0) {
        mId = existing[0].id;
      } else {
        const [newMarket] = await db.insert(markets).values({ name: marketName }).returning();
        mId = newMarket.id;
      }
    }

    if (!mId || !total || !date) {
      return NextResponse.json({ error: "Missing marketId/total/date" }, { status: 400 });
    }

    // Criar receipt
    const [receipt] = await db.insert(receipts).values({
      marketId: mId,
      total: String(total),
      date,
      imageUrl: imageUrl || null,
    }).returning();

    // Inserir items
    const insertedItems = [];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        let pId = item.productId;

        if (!pId && item.productName) {
          const existing = await db.select().from(products).where(eq(products.name, item.productName)).limit(1);
          if (existing.length > 0) {
            pId = existing[0].id;
          } else {
            const [newProduct] = await db.insert(products).values({
              name: item.productName,
              brand: item.brand || null,
              category: item.category || null,
              unit: item.unit || null,
            }).returning();
            pId = newProduct.id;
          }
        }

        if (!pId) continue;

        const [ri] = await db.insert(receiptItems).values({
          receiptId: receipt.id,
          productId: pId,
          quantity: String(item.quantity || 1),
          unitPrice: String(item.unitPrice),
          totalPrice: String(item.totalPrice || item.unitPrice * (item.quantity || 1)),
        }).returning();

        insertedItems.push(ri);

        // Também registrar o preço na tabela prices (source: receipt)
        await db.insert(prices).values({
          productId: pId,
          marketId: mId,
          price: String(item.unitPrice),
          source: "receipt",
        });
      }
    }

    return NextResponse.json({ success: true, receipt, items: insertedItems });
  } catch (error) {
    console.error("Error saving receipt:", error);
    return NextResponse.json({ error: "Failed to save receipt" }, { status: 500 });
  }
}

// GET /api/receipts — listar notas fiscais
export async function GET() {
  try {
    const allReceipts = await db
      .select({
        id: receipts.id,
        total: receipts.total,
        date: receipts.date,
        imageUrl: receipts.imageUrl,
        createdAt: receipts.createdAt,
        marketName: markets.name,
      })
      .from(receipts)
      .innerJoin(markets, eq(receipts.marketId, markets.id))
      .orderBy(desc(receipts.date))
      .limit(50);

    return NextResponse.json(allReceipts);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}
