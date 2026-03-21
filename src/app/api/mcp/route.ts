import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { db } from "@/db";
import { products, prices, markets, needs, productNeeds, receipts, receiptItems } from "@/db/schema";
import { eq, desc, gte, and, sql, or, isNull } from "drizzle-orm";
import { sanitize, positiveNumber } from "@/lib/validation";
import { matchAndPersist, rematchAllProducts } from "@/lib/match-engine";
import { getProductStats, getBestPrice } from "@/lib/price-analytics";

function createServer() {
  const server = new McpServer(
    { name: "julius", version: "1.0.0" },
    { capabilities: { logging: {} } }
  );

  // ──────────────────────────────────────────────
  // Tool: register_promo_prices
  // ──────────────────────────────────────────────
  server.registerTool(
    "register_promo_prices",
    {
      title: "Registrar preços de promoção",
      description:
        "Salva preços extraídos de encartes promocionais. Aceita múltiplos produtos de uma vez. " +
        "Cria produtos e mercados automaticamente se não existirem. " +
        "Faz dedup de 24h e roda matching contra needs do usuário.",
      inputSchema: {
        items: z
          .array(
            z.object({
              productName: z.string().describe("Nome do produto (ex: 'Cerveja Brahma Lata 350ml')"),
              marketName: z.string().describe("Nome do mercado (ex: 'Atacadão')"),
              price: z.number().describe("Preço em R$"),
              brand: z.string().optional().describe("Marca do produto"),
              category: z.string().optional().describe("Categoria (ex: 'Bebidas', 'Laticínios')"),
              unitType: z.string().optional().describe("Tipo de unidade: kg, g, L, mL, un"),
              unitQuantity: z.number().optional().describe("Quantidade da unidade (ex: 350 para 350ml)"),
              priceType: z.enum(["regular", "loyalty", "bulk"]).optional().describe("Tipo de preço"),
              promoValidUntil: z.string().optional().describe("Data de validade da promoção (ISO 8601)"),
            })
          )
          .describe("Lista de produtos com preços"),
      },
      annotations: { destructiveHint: false, readOnlyHint: false },
    },
    async ({ items }) => {
      // Delegate to the existing prices API logic
      const response = await fetch(
        new URL("/api/prices", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.JULIUS_API_KEY}`,
          },
          body: JSON.stringify(
            items.map((item) => ({
              ...item,
              source: "promo",
            }))
          ),
        }
      );
      const data = await response.json();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ──────────────────────────────────────────────
  // Tool: register_receipt
  // ──────────────────────────────────────────────
  server.registerTool(
    "register_receipt",
    {
      title: "Registrar nota fiscal",
      description:
        "Salva uma nota fiscal com seus itens. Cria produtos automaticamente, " +
        "registra preços, roda matching contra needs, e auto-cria needs para " +
        "categorias novas que o usuário comprou.",
      inputSchema: {
        marketName: z.string().describe("Nome do mercado"),
        total: z.number().describe("Valor total da nota em R$"),
        date: z.string().describe("Data da compra (YYYY-MM-DD)"),
        imageUrl: z.string().optional().describe("URL da imagem da nota"),
        items: z.array(
          z.object({
            productName: z.string().describe("Nome do produto"),
            unitPrice: z.number().describe("Preço unitário em R$"),
            quantity: z.number().optional().describe("Quantidade (default: 1)"),
            totalPrice: z.number().optional().describe("Preço total do item"),
            brand: z.string().optional(),
            category: z.string().optional(),
            unit: z.string().optional(),
          })
        ),
      },
      annotations: { destructiveHint: false, readOnlyHint: false },
    },
    async ({ marketName, total, date, imageUrl, items }) => {
      const response = await fetch(
        new URL("/api/receipts", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.JULIUS_API_KEY}`,
          },
          body: JSON.stringify({ marketName, total, date, imageUrl, items }),
        }
      );
      const data = await response.json();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ──────────────────────────────────────────────
  // Tool: get_deals
  // ──────────────────────────────────────────────
  server.registerTool(
    "get_deals",
    {
      title: "Ver ofertas e alertas",
      description:
        "Retorna promoções que fazem match com as necessidades do usuário. " +
        "Mostra se o preço está abaixo do alvo, % abaixo da média, e se é um bom negócio. " +
        "Use para o CRON de alertas ou quando o usuário perguntar sobre ofertas.",
      inputSchema: {
        market: z.string().optional().describe("Filtrar por mercado (ex: 'Atacadão')"),
        needId: z.number().optional().describe("Filtrar por necessidade específica"),
        onlyDeals: z.boolean().optional().describe("Só mostrar needs com deals ativos"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ market, needId, onlyDeals }) => {
      const params = new URLSearchParams();
      if (market) params.set("market", market);
      if (needId) params.set("needId", String(needId));
      if (onlyDeals) params.set("onlyDeals", "true");

      const response = await fetch(
        new URL(`/api/alerts?${params}`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
        {
          headers: { Authorization: `Bearer ${process.env.JULIUS_API_KEY}` },
        }
      );
      const data = await response.json();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ──────────────────────────────────────────────
  // Tool: get_best_price
  // ──────────────────────────────────────────────
  server.registerTool(
    "get_best_price",
    {
      title: "Melhor preço de um produto",
      description:
        "Busca o menor preço atual de um produto em todos os mercados. " +
        "Útil quando o usuário pergunta: 'onde está mais barato o açúcar?'",
      inputSchema: {
        query: z.string().describe("Nome do produto para buscar (fuzzy match)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ query }) => {
      // Search products by name
      const matchedProducts = await db
        .select({ id: products.id, name: products.name, brand: products.brand })
        .from(products)
        .where(sql`LOWER(${products.name}) LIKE LOWER(${"%" + query + "%"})`)
        .limit(5);

      if (matchedProducts.length === 0) {
        return {
          content: [{ type: "text" as const, text: `Nenhum produto encontrado para "${query}".` }],
        };
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const results = [];
      for (const product of matchedProducts) {
        const bestPriceResult = await getBestPrice(product.id);
        const stats = await getProductStats(product.id);

        results.push({
          productName: product.name,
          brand: product.brand,
          bestPrice: bestPriceResult,
          stats: stats
            ? {
                avgPrice30d: stats.avgPrice30d,
                minPrice90d: stats.minPrice90d,
                percentBelowAvg: stats.percentBelowAvg,
                isGoodDeal: stats.isGoodDeal,
                trend: stats.trend,
              }
            : null,
        });
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  // ──────────────────────────────────────────────
  // Tool: check_market_promos
  // ──────────────────────────────────────────────
  server.registerTool(
    "check_market_promos",
    {
      title: "Promoções de um mercado",
      description:
        "Lista todas as promoções válidas de um mercado específico. " +
        "Útil para: 'vou passar na frente do Tenda, tem algo que vale a pena?'",
      inputSchema: {
        marketName: z.string().describe("Nome do mercado"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ marketName }) => {
      // Find market
      const [market] = await db
        .select({ id: markets.id, name: markets.name })
        .from(markets)
        .where(sql`LOWER(TRIM(${markets.name})) LIKE LOWER(${"%" + marketName.trim() + "%"})`)
        .limit(1);

      if (!market) {
        return {
          content: [{ type: "text" as const, text: `Mercado "${marketName}" não encontrado.` }],
        };
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const promos = await db
        .select({
          productName: products.name,
          brand: products.brand,
          price: prices.price,
          priceType: prices.priceType,
          normalizedPrice: prices.normalizedPrice,
          normalizedUnit: prices.normalizedUnit,
          source: prices.source,
          promoValidUntil: prices.promoValidUntil,
          createdAt: prices.createdAt,
        })
        .from(prices)
        .innerJoin(products, eq(prices.productId, products.id))
        .where(
          and(
            eq(prices.marketId, market.id),
            gte(prices.createdAt, sevenDaysAgo),
            or(
              isNull(prices.promoValidUntil),
              gte(prices.promoValidUntil, new Date())
            )
          )
        )
        .orderBy(desc(prices.createdAt))
        .limit(50);

      // Enrich with need matching info
      const enriched = [];
      for (const promo of promos) {
        const [matchedNeed] = await db
          .select({
            needName: needs.name,
            targetPrice: needs.targetPrice,
          })
          .from(productNeeds)
          .innerJoin(needs, eq(productNeeds.needId, needs.id))
          .innerJoin(products, eq(productNeeds.productId, products.id))
          .where(
            and(
              eq(products.name, promo.productName),
              eq(needs.active, true)
            )
          )
          .limit(1);

        const currentPrice = parseFloat(promo.price);
        const targetPrice = matchedNeed?.targetPrice
          ? parseFloat(matchedNeed.targetPrice)
          : null;

        enriched.push({
          ...promo,
          matchedNeed: matchedNeed?.needName || null,
          targetPrice,
          isBelowTarget: targetPrice ? currentPrice <= targetPrice : null,
        });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { market: market.name, promos: enriched, count: enriched.length },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ──────────────────────────────────────────────
  // Tool: get_price_analysis
  // ──────────────────────────────────────────────
  server.registerTool(
    "get_price_analysis",
    {
      title: "Análise de preço de um produto",
      description:
        "Retorna análise detalhada de preço: média 30d, mínimo 90d, desvio padrão, " +
        "tendência (subindo/caindo/estável), e se o preço atual é um bom negócio. " +
        "Use quando o usuário perguntar: 'vale a pena comprar açúcar agora?'",
      inputSchema: {
        query: z.string().describe("Nome do produto para analisar"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ query }) => {
      const matchedProducts = await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(sql`LOWER(${products.name}) LIKE LOWER(${"%" + query + "%"})`)
        .limit(3);

      if (matchedProducts.length === 0) {
        return {
          content: [{ type: "text" as const, text: `Nenhum produto encontrado para "${query}".` }],
        };
      }

      const analyses = [];
      for (const product of matchedProducts) {
        const stats = await getProductStats(product.id);
        if (stats) analyses.push(stats);
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(analyses, null, 2) }],
      };
    }
  );

  // ──────────────────────────────────────────────
  // Tool: manage_need
  // ──────────────────────────────────────────────
  server.registerTool(
    "manage_need",
    {
      title: "Gerenciar necessidade",
      description:
        "Cria ou atualiza uma necessidade do usuário. Necessidades definem o que o usuário " +
        "precisa comprar e o preço alvo para alertas. " +
        "Use quando o usuário disser: 'preciso comprar açúcar' ou 'meu alvo de cerveja é R$3,00'.",
      inputSchema: {
        action: z.enum(["create", "update", "deactivate"]).describe("Ação: criar, atualizar, ou desativar"),
        id: z.number().optional().describe("ID da necessidade (obrigatório para update/deactivate)"),
        name: z.string().optional().describe("Nome da necessidade (ex: 'Cerveja')"),
        category: z.string().optional().describe("Categoria (ex: 'Bebidas')"),
        keywords: z.array(z.string()).optional().describe("Palavras-chave para match (ex: ['cerveja', 'beer'])"),
        preferred: z.array(z.string()).optional().describe("Marcas preferidas (ex: ['Brahma', 'Skol'])"),
        targetPrice: z.number().optional().describe("Preço alvo em R$"),
        targetUnit: z.string().optional().describe("Unidade de referência (ex: 'Lata 350ml', '1kg')"),
        alertMode: z.enum(["below_target", "always", "never"]).optional(),
        notes: z.string().optional(),
      },
      annotations: { destructiveHint: false, readOnlyHint: false },
    },
    async ({ action, id, name, category, keywords, preferred, targetPrice, targetUnit, alertMode, notes }) => {
      try {
        if (action === "create") {
          if (!name) {
            return { content: [{ type: "text" as const, text: "Erro: name é obrigatório para criar." }] };
          }
          const kws = keywords && keywords.length > 0 ? keywords : [name.toLowerCase()];
          const [created] = await db
            .insert(needs)
            .values({
              name: name.trim(),
              category: category?.trim() || null,
              keywords: kws,
              preferred: preferred || [],
              targetPrice: targetPrice ? String(targetPrice) : null,
              targetUnit: targetUnit?.trim() || null,
              alertMode: alertMode || "below_target",
              notes: notes?.trim() || null,
            })
            .returning();

          await rematchAllProducts();
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ success: true, need: created }, null, 2) }],
          };
        }

        if (action === "update") {
          if (!id) {
            return { content: [{ type: "text" as const, text: "Erro: id é obrigatório para atualizar." }] };
          }
          const updateData: Record<string, unknown> = {};
          if (name !== undefined) updateData.name = name.trim();
          if (category !== undefined) updateData.category = category?.trim() || null;
          if (keywords !== undefined) updateData.keywords = keywords;
          if (preferred !== undefined) updateData.preferred = preferred;
          if (targetPrice !== undefined) updateData.targetPrice = targetPrice ? String(targetPrice) : null;
          if (targetUnit !== undefined) updateData.targetUnit = targetUnit?.trim() || null;
          if (alertMode !== undefined) updateData.alertMode = alertMode;
          if (notes !== undefined) updateData.notes = notes?.trim() || null;

          const [updated] = await db.update(needs).set(updateData).where(eq(needs.id, id)).returning();
          if (keywords !== undefined || name !== undefined) await rematchAllProducts();
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ success: true, need: updated }, null, 2) }],
          };
        }

        if (action === "deactivate") {
          if (!id) {
            return { content: [{ type: "text" as const, text: "Erro: id é obrigatório para desativar." }] };
          }
          await db.update(needs).set({ active: false }).where(eq(needs.id, id));
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ success: true, deactivated: id }) }],
          };
        }

        return { content: [{ type: "text" as const, text: "Ação inválida." }] };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Erro: ${error instanceof Error ? error.message : "unknown"}` }],
        };
      }
    }
  );

  // ──────────────────────────────────────────────
  // Tool: search_products
  // ──────────────────────────────────────────────
  server.registerTool(
    "search_products",
    {
      title: "Buscar produtos",
      description:
        "Busca produtos cadastrados com seus preços mais recentes em cada mercado. " +
        "Útil para consultar o que temos registrado.",
      inputSchema: {
        query: z.string().optional().describe("Termo de busca por nome/marca"),
        category: z.string().optional().describe("Filtrar por categoria"),
        limit: z.number().optional().describe("Máximo de resultados (default: 20)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ query, category, limit }) => {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (category) params.set("category", category);
      if (limit) params.set("limit", String(limit));

      const response = await fetch(
        new URL(`/api/products?${params}`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
        {
          headers: { Authorization: `Bearer ${process.env.JULIUS_API_KEY}` },
        }
      );
      const data = await response.json();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  return server;
}

// Handle each request with a fresh transport (stateless mode for serverless)
async function handleMcpRequest(req: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  const server = createServer();
  await server.connect(transport);

  try {
    return await transport.handleRequest(req);
  } finally {
    await transport.close();
    await server.close();
  }
}

export async function POST(req: Request) {
  return handleMcpRequest(req);
}

export async function GET(req: Request) {
  return handleMcpRequest(req);
}

export async function DELETE(req: Request) {
  return handleMcpRequest(req);
}
