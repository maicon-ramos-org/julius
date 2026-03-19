import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shoppingList, products, prices, markets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sanitize, positiveNumber, positiveInt } from "@/lib/validation";

// GET /api/shopping-list
export async function GET() {
  try {
    const items = await db
      .select({
        id: shoppingList.id,
        quantity: shoppingList.quantity,
        notes: shoppingList.notes,
        checked: shoppingList.checked,
        productId: shoppingList.productId,
        productName: products.name,
        productBrand: products.brand,
        productUnit: products.unit,
      })
      .from(shoppingList)
      .innerJoin(products, eq(shoppingList.productId, products.id))
      .orderBy(shoppingList.createdAt);

    // Enriquecer com melhor preço
    const enriched = await Promise.all(
      items.map(async (item) => {
        const latestPrices = await db
          .select({
            price: prices.price,
            marketName: markets.name,
          })
          .from(prices)
          .innerJoin(markets, eq(prices.marketId, markets.id))
          .where(eq(prices.productId, item.productId))
          .orderBy(desc(prices.createdAt))
          .limit(6);

        const bestPrice =
          latestPrices.length > 0
            ? latestPrices.reduce((min, p) =>
                parseFloat(p.price) < parseFloat(min.price) ? p : min
              )
            : null;

        return {
          id: item.id,
          quantity: item.quantity,
          notes: item.notes,
          checked: item.checked,
          product: {
            id: item.productId,
            name: item.productName,
            brand: item.productBrand,
            unit: item.productUnit,
          },
          bestPrice,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    return NextResponse.json(
      { error: "Failed to fetch shopping list" },
      { status: 500 }
    );
  }
}

// POST /api/shopping-list — adicionar item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const quantity = positiveNumber(body.quantity) || 1;
    const notes = sanitize(body.notes);

    let pId = positiveInt(body.productId);
    const pName = sanitize(body.productName);

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
            brand: sanitize(body.brand) || null,
            category: sanitize(body.category) || null,
            unit: sanitize(body.unit) || null,
          })
          .returning();
        pId = newProduct.id;
      }
    }

    if (!pId) {
      return NextResponse.json(
        { error: "Missing productId or productName" },
        { status: 400 }
      );
    }

    const [item] = await db
      .insert(shoppingList)
      .values({
        productId: pId,
        quantity: String(quantity),
        notes: notes || null,
      })
      .returning();

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Error adding to shopping list:", error);
    return NextResponse.json(
      { error: "Failed to add item" },
      { status: 500 }
    );
  }
}

// PATCH /api/shopping-list — toggle checked
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = positiveInt(body.id);
    const checked = typeof body.checked === "boolean" ? body.checked : null;

    if (!id || checked === null) {
      return NextResponse.json(
        { error: "Missing or invalid id/checked" },
        { status: 400 }
      );
    }

    await db
      .update(shoppingList)
      .set({ checked })
      .where(eq(shoppingList.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating shopping list:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE /api/shopping-list — remover item
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const id = positiveInt(body.id);

    if (!id) {
      return NextResponse.json(
        { error: "Missing or invalid id" },
        { status: 400 }
      );
    }

    await db.delete(shoppingList).where(eq(shoppingList.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting from shopping list:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
