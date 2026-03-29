import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, prices, markets, receiptItems, shoppingList, productNeeds } from "@/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { sanitize, positiveNumber } from "@/lib/validation";

// GET /api/products — listar produtos com melhor preço (single query, no N+1)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Subquery: best price per product in last 7 days
    const bestPriceSub = db
      .select({
        productId: prices.productId,
        minPrice: sql<string>`MIN(${prices.price}::numeric)`.as("min_price"),
      })
      .from(prices)
      .where(gte(prices.createdAt, sevenDaysAgo))
      .groupBy(prices.productId)
      .as("best_price");

    // Build conditions
    const conditions = [];
    if (search) {
      conditions.push(
        sql`(LOWER(${products.name}) LIKE LOWER(${"%" + search + "%"}) OR LOWER(${products.brand}) LIKE LOWER(${"%" + search + "%"}))`
      );
    }
    if (category) {
      conditions.push(
        sql`LOWER(${products.category}) = LOWER(${category})`
      );
    }

    // Main query: products LEFT JOIN best price
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        category: products.category,
        unit: products.unit,
        unitType: products.unitType,
        unitQuantity: products.unitQuantity,
        createdAt: products.createdAt,
        bestPrice: bestPriceSub.minPrice,
      })
      .from(products)
      .leftJoin(bestPriceSub, eq(products.id, bestPriceSub.productId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(products.name)
      .limit(limit);

    // For products with a best price, get which market has it (single batch query)
    const productIds = allProducts
      .filter((p) => p.bestPrice !== null)
      .map((p) => p.id);

    let priceMarketMap: Record<number, { marketName: string; marketLogoUrl: string | null; source: string }> = {};

    if (productIds.length > 0) {
      const priceDetails = await db
        .select({
          productId: prices.productId,
          price: prices.price,
          marketName: markets.name,
          marketLogoUrl: markets.logoUrl,
          source: prices.source,
        })
        .from(prices)
        .innerJoin(markets, eq(prices.marketId, markets.id))
        .where(
          and(
            sql`${prices.productId} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`,
            gte(prices.createdAt, sevenDaysAgo)
          )
        )
        .orderBy(sql`${prices.price}::numeric ASC`);

      // Keep only the first (cheapest) per product
      for (const pd of priceDetails) {
        if (!priceMarketMap[pd.productId]) {
          priceMarketMap[pd.productId] = {
            marketName: pd.marketName,
            marketLogoUrl: pd.marketLogoUrl,
            source: pd.source,
          };
        }
      }
    }

    const enriched = allProducts.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      unit: product.unit,
      unitType: product.unitType,
      unitQuantity: product.unitQuantity,
      createdAt: product.createdAt,
      bestPrice: product.bestPrice
        ? {
            price: product.bestPrice,
            marketName: priceMarketMap[product.id]?.marketName || null,
            marketLogoUrl: priceMarketMap[product.id]?.marketLogoUrl || null,
            source: priceMarketMap[product.id]?.source || null,
          }
        : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/products — criar produto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = sanitize(body.name);

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    // Check duplicate
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(sql`LOWER(TRIM(${products.name})) = LOWER(TRIM(${name}))`)
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Produto com esse nome já existe" }, { status: 409 });
    }

    const [created] = await db
      .insert(products)
      .values({
        name,
        brand: sanitize(body.brand) || null,
        category: sanitize(body.category) || null,
        unit: sanitize(body.unit) || null,
        unitType: sanitize(body.unitType) || null,
        unitQuantity: body.unitQuantity ? String(positiveNumber(body.unitQuantity)) : null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

// PUT /api/products — atualizar produto
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = sanitize(body.name);
    if (body.brand !== undefined) updateData.brand = sanitize(body.brand) || null;
    if (body.category !== undefined) updateData.category = sanitize(body.category) || null;
    if (body.unit !== undefined) updateData.unit = sanitize(body.unit) || null;
    if (body.unitType !== undefined) updateData.unitType = sanitize(body.unitType) || null;
    if (body.unitQuantity !== undefined) {
      updateData.unitQuantity = body.unitQuantity ? String(positiveNumber(body.unitQuantity)) : null;
    }

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/products — deletar produto
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "");
    if (isNaN(id)) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }

    // Check FK dependencies
    const [hasPrice] = await db.select({ id: prices.id }).from(prices).where(eq(prices.productId, id)).limit(1);
    const [hasReceiptItem] = await db.select({ id: receiptItems.id }).from(receiptItems).where(eq(receiptItems.productId, id)).limit(1);
    const [hasShoppingItem] = await db.select({ id: shoppingList.id }).from(shoppingList).where(eq(shoppingList.productId, id)).limit(1);

    if (hasPrice || hasReceiptItem || hasShoppingItem) {
      return NextResponse.json(
        { error: "Produto possui preços, notas ou itens de lista vinculados. Exclua-os primeiro." },
        { status: 409 }
      );
    }

    // Clean up productNeeds
    await db.delete(productNeeds).where(eq(productNeeds.productId, id));
    await db.delete(products).where(eq(products.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
