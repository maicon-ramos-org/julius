import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { needs } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/needs/:id — buscar necessidade por id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [need] = await db
      .select()
      .from(needs)
      .where(eq(needs.id, numId));

    if (!need) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    return NextResponse.json(need);
  } catch (error) {
    console.error("Error fetching need:", error);
    return NextResponse.json({ error: "Failed to fetch need" }, { status: 500 });
  }
}
