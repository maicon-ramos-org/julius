import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { insertionLogs, markets } from "@/db/schema";
import { desc, gte, lte, eq, and, sql, or } from "drizzle-orm";
import { sanitize, positiveInt } from "@/lib/validation";

// Helper function to create a log entry
export async function createInsertionLog({
  action,
  source,
  marketName = null,
  summary,
  details = null,
  itemCount = 0,
  promoValidUntil = null,
}: {
  action: string;
  source: string;
  marketName?: string | null;
  summary: string;
  details?: any;
  itemCount?: number;
  promoValidUntil?: Date | null;
}) {
  try {
    await db.insert(insertionLogs).values({
      action,
      source,
      marketName,
      summary,
      details: details ? JSON.stringify(details) : null,
      itemCount,
      promoValidUntil,
    });
  } catch (error) {
    console.error("Failed to create insertion log (non-blocking):", error);
  }
}

// GET /api/logs - listar logs com paginação e filtros
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const page = positiveInt(searchParams.get("page")) || 1;
    const limit = Math.min(positiveInt(searchParams.get("limit")) || 20, 100);
    const offset = (page - 1) * limit;

    // Filtros
    const actionFilter = sanitize(searchParams.get("action"));
    const sourceFilter = sanitize(searchParams.get("source"));
    const marketFilter = sanitize(searchParams.get("marketName"));
    const startDate = sanitize(searchParams.get("startDate"));
    const endDate = sanitize(searchParams.get("endDate"));

    // Construir condições WHERE
    const conditions = [];

    if (actionFilter) {
      conditions.push(eq(insertionLogs.action, actionFilter));
    }

    if (sourceFilter) {
      conditions.push(eq(insertionLogs.source, sourceFilter));
    }

    if (marketFilter) {
      conditions.push(
        sql`LOWER(${insertionLogs.marketName}) LIKE LOWER(${"%" + marketFilter + "%"})`
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(gte(insertionLogs.createdAt, start));
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        // Add 23:59:59 to include the entire end date
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(insertionLogs.createdAt, end));
      }
    }

    // Query principal com paginação
    const logs = await db
      .select()
      .from(insertionLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(insertionLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Contar total para paginação
    const [{ count: totalCount }] = await db
      .select({ count: sql`COUNT(*)`.as('count') })
      .from(insertionLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalPages = Math.ceil(Number(totalCount) / limit);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        totalCount: Number(totalCount),
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

// POST /api/logs - criar log manualmente (para uso interno)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, source, marketName, summary, details, itemCount, promoValidUntil } = body;

    if (!action || !source || !summary) {
      return NextResponse.json(
        { error: "action, source e summary são obrigatórios" },
        { status: 400 }
      );
    }

    let validPromoUntil: Date | null = null;
    if (promoValidUntil) {
      const d = new Date(promoValidUntil);
      if (!isNaN(d.getTime())) {
        validPromoUntil = d;
      }
    }

    const [log] = await db
      .insert(insertionLogs)
      .values({
        action: (sanitize(action) ?? action) as string,
        source: (sanitize(source) ?? source) as string,
        marketName: sanitize(marketName) || null,
        summary: (sanitize(summary) ?? summary) as string,
        details: details ? JSON.stringify(details) : null,
        itemCount: positiveInt(itemCount) || 0,
        promoValidUntil: validPromoUntil,
      })
      .returning();

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Error creating log:", error);
    return NextResponse.json(
      { error: "Failed to create log" },
      { status: 500 }
    );
  }
}

// GET stats - estatísticas dos logs
export async function getLogStats() {
  try {
    // Logs dos últimos 30 dias por ação
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const actionStats = await db
      .select({
        action: insertionLogs.action,
        count: sql`COUNT(*)`.as('count'),
        totalItems: sql`SUM(${insertionLogs.itemCount})`.as('totalItems'),
      })
      .from(insertionLogs)
      .where(gte(insertionLogs.createdAt, thirtyDaysAgo))
      .groupBy(insertionLogs.action)
      .orderBy(desc(sql`COUNT(*)`));

    // Logs por mercado
    const marketStats = await db
      .select({
        marketName: insertionLogs.marketName,
        count: sql`COUNT(*)`.as('count'),
        totalItems: sql`SUM(${insertionLogs.itemCount})`.as('totalItems'),
      })
      .from(insertionLogs)
      .where(
        and(
          gte(insertionLogs.createdAt, thirtyDaysAgo),
          sql`${insertionLogs.marketName} IS NOT NULL`
        )
      )
      .groupBy(insertionLogs.marketName)
      .orderBy(desc(sql`COUNT(*)`));

    return {
      actionStats: actionStats.map(s => ({
        action: s.action,
        count: Number(s.count),
        totalItems: Number(s.totalItems) || 0,
      })),
      marketStats: marketStats.map(s => ({
        marketName: s.marketName,
        count: Number(s.count),
        totalItems: Number(s.totalItems) || 0,
      })),
    };
  } catch (error) {
    console.error("Error fetching log stats:", error);
    return { actionStats: [], marketStats: [] };
  }
}