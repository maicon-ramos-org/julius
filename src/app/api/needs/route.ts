import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { needs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

// GET /api/needs — listar necessidades
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeFilter = searchParams.get("active");

    let query = db.select().from(needs).orderBy(asc(needs.name));

    if (activeFilter === "true") {
      query = query.where(eq(needs.active, true)) as typeof query;
    } else if (activeFilter === "false") {
      query = query.where(eq(needs.active, false)) as typeof query;
    }

    const result = await query;
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching needs:", error);
    return NextResponse.json({ error: "Failed to fetch needs" }, { status: 500 });
  }
}

// POST /api/needs — criar necessidade
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const keywords = body.keywords && body.keywords.length > 0
      ? body.keywords
      : [body.name.toLowerCase()];

    const [created] = await db.insert(needs).values({
      name: body.name.trim(),
      category: body.category?.trim() || null,
      keywords,
      preferred: body.preferred || [],
      targetPrice: body.targetPrice ? String(body.targetPrice) : null,
      targetUnit: body.targetUnit?.trim() || null,
      alertMode: body.alertMode || "below_target",
      notes: body.notes?.trim() || null,
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating need:", error);
    return NextResponse.json({ error: "Failed to create need" }, { status: 500 });
  }
}

// PUT /api/needs — atualizar necessidade
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.category !== undefined) updateData.category = body.category?.trim() || null;
    if (body.keywords !== undefined) updateData.keywords = body.keywords;
    if (body.preferred !== undefined) updateData.preferred = body.preferred;
    if (body.targetPrice !== undefined) updateData.targetPrice = body.targetPrice ? String(body.targetPrice) : null;
    if (body.targetUnit !== undefined) updateData.targetUnit = body.targetUnit?.trim() || null;
    if (body.alertMode !== undefined) updateData.alertMode = body.alertMode;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

    const [updated] = await db
      .update(needs)
      .set(updateData)
      .where(eq(needs.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating need:", error);
    return NextResponse.json({ error: "Failed to update need" }, { status: 500 });
  }
}

// DELETE /api/needs — deletar ou desativar necessidade
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    }

    const numId = parseInt(id);

    // Se tiver ?hard=true, deleta de verdade
    const hard = searchParams.get("hard") === "true";

    if (hard) {
      await db.delete(needs).where(eq(needs.id, numId));
    } else {
      await db.update(needs).set({ active: false }).where(eq(needs.id, numId));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting need:", error);
    return NextResponse.json({ error: "Failed to delete need" }, { status: 500 });
  }
}
