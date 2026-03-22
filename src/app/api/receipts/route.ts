import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { receipts, receiptItems, products, markets, prices, needs } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { sanitize, positiveNumber, positiveInt } from "@/lib/validation";
import { matchAndPersist, matchProductToNeeds, getActiveNeeds } from "@/lib/match-engine";
import { findOrCreateMarket } from "@/lib/market-lookup";

// POST /api/receipts — salvar nota fiscal processada
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { marketId, marketName, total, date, imageUrl, items } = body;

    // Validate required fields
    const validTotal = positiveNumber(total);
    const validDate = sanitize(date);

    if (!validTotal || !validDate) {
      return NextResponse.json(
        { error: "Missing or invalid total/date" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    let mId = positiveInt(marketId);
    const mName = sanitize(marketName);

    if (!mId && mName) {
      mId = await findOrCreateMarket(mName);
    }

    if (!mId) {
      return NextResponse.json(
        { error: "Missing marketId or marketName" },
        { status: 400 }
      );
    }

    // Criar receipt
    const [receipt] = await db
      .insert(receipts)
      .values({
        marketId: mId,
        total: String(validTotal),
        date: validDate,
        imageUrl: sanitize(imageUrl) || null,
      })
      .returning();

    // Inserir items
    const insertedItems = [];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        let pId = positiveInt(item.productId);
        const pName = sanitize(item.productName);

        if (!pId && pName) {
          const existing = await db
            .select()
            .from(products)
            .where(eq(products.name, pName))
            .limit(1);
          if (existing.length > 0) {
            pId = existing[0].id;
          } else {
            const [newProduct] = await db
              .insert(products)
              .values({
                name: pName,
                brand: sanitize(item.brand) || null,
                category: sanitize(item.category) || null,
                unit: sanitize(item.unit) || null,
              })
              .returning();
            pId = newProduct.id;
          }
        }

        if (!pId) continue;

        const unitPrice = positiveNumber(item.unitPrice);
        if (!unitPrice) continue;

        const quantity = positiveNumber(item.quantity) || 1;
        const totalPrice =
          positiveNumber(item.totalPrice) || unitPrice * quantity;

        const [ri] = await db
          .insert(receiptItems)
          .values({
            receiptId: receipt.id,
            productId: pId,
            quantity: String(quantity),
            unitPrice: String(unitPrice),
            totalPrice: String(totalPrice),
          })
          .returning();

        insertedItems.push(ri);

        // Também registrar o preço na tabela prices (source: receipt)
        await db.insert(prices).values({
          productId: pId,
          marketId: mId,
          price: String(unitPrice),
          source: "receipt",
        });

        // Run match engine for this product
        const productName = pName || (await db
          .select({ name: products.name })
          .from(products)
          .where(eq(products.id, pId))
          .limit(1))[0]?.name;

        if (productName) {
          await matchAndPersist(pId, productName);

          // Auto-create need if no matching need exists for this product's category
          try {
            const activeNeeds = await getActiveNeeds();
            const matches = matchProductToNeeds(productName, activeNeeds);
            if (matches.length === 0) {
              const category = sanitize(item.category) || null;
              const needName = category || productName;
              // Check if a need with this name already exists
              const [existingNeed] = await db
                .select({ id: needs.id })
                .from(needs)
                .where(sql`LOWER(TRIM(${needs.name})) = LOWER(TRIM(${needName}))`)
                .limit(1);

              if (!existingNeed) {
                const keywords = [needName.toLowerCase()];
                if (category && category.toLowerCase() !== productName.toLowerCase()) {
                  keywords.push(productName.toLowerCase());
                }
                await db.insert(needs).values({
                  name: needName,
                  category: category,
                  keywords,
                  targetPrice: String(unitPrice),
                  alertMode: "below_target",
                  notes: "Criado automaticamente a partir de nota fiscal",
                });
              }
            }
          } catch (autoNeedErr) {
            console.error("Auto-create need error (non-blocking):", autoNeedErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true, receipt, items: insertedItems });
  } catch (error) {
    console.error("Error saving receipt:", error);
    return NextResponse.json(
      { error: "Failed to save receipt" },
      { status: 500 }
    );
  }
}

// GET /api/receipts — listar notas fiscais com itens
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

    // Batch fetch all items for these receipts
    const receiptIds = allReceipts.map((r) => r.id);
    let itemsByReceipt: Record<number, Array<{
      id: number;
      productName: string;
      productBrand: string | null;
      quantity: string;
      unitPrice: string;
      totalPrice: string;
    }>> = {};

    if (receiptIds.length > 0) {
      const allItems = await db
        .select({
          id: receiptItems.id,
          receiptId: receiptItems.receiptId,
          productName: products.name,
          productBrand: products.brand,
          quantity: receiptItems.quantity,
          unitPrice: receiptItems.unitPrice,
          totalPrice: receiptItems.totalPrice,
        })
        .from(receiptItems)
        .innerJoin(products, eq(receiptItems.productId, products.id))
        .where(
          sql`${receiptItems.receiptId} IN (${sql.join(receiptIds.map(id => sql`${id}`), sql`, `)})`
        )
        .orderBy(receiptItems.id);

      for (const item of allItems) {
        if (!itemsByReceipt[item.receiptId]) {
          itemsByReceipt[item.receiptId] = [];
        }
        itemsByReceipt[item.receiptId].push({
          id: item.id,
          productName: item.productName,
          productBrand: item.productBrand,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        });
      }
    }

    const enriched = allReceipts.map((receipt) => ({
      ...receipt,
      items: itemsByReceipt[receipt.id] || [],
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipts" },
      { status: 500 }
    );
  }
}

// DELETE /api/receipts — deletar nota fiscal e seus itens
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "");
    if (isNaN(id)) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }

    // Cascade: delete receipt items first
    await db.delete(receiptItems).where(eq(receiptItems.receiptId, id));
    await db.delete(receipts).where(eq(receipts.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting receipt:", error);
    return NextResponse.json({ error: "Failed to delete receipt" }, { status: 500 });
  }
}
