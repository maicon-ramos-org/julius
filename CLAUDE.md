# CLAUDE.md — Julius: Smart Grocery App

## Objetivo

App pessoal de compras inteligente para monitorar preços de 6 mercados em Hortolândia/SP (Atacadão, Tenda, Assaí, Arena, Morete, São Vicente). O sistema recebe encartes de promoção via WhatsApp→n8n→Telegram, extrai produtos/preços com IA (Vision AI), e alerta quando algo que o usuário compra está barato.

## Como funciona o fluxo

1. Mercados publicam encartes de promoção (imagens/PDFs)
2. Usuário encaminha pro WhatsApp
3. n8n recebe e envia pro Telegram
4. Agente Julius (OpenClaw) recebe a imagem, extrai produtos e preços via Vision AI
5. Agente Julius chama a API do app pra salvar produtos e preços
6. App compara com as "necessidades" do usuário (needs)
7. Se preço está abaixo do alvo → alerta!

## Conceito de "Needs" (Necessidades)

O coração do app. O usuário NÃO quer alerta por produto exato (SKU). Quer por CATEGORIA/TIPO.

Exemplos:
- "Cerveja" → aceita qualquer marca abaixo de R$3,50/lata
- "Batata Frita 2kg" → aceita qualquer marca abaixo de R$19,99
- Keywords fazem match fuzzy: "Marg. Qualy 500g" casa com need "Margarina" (keywords: `["margarina", "manteiga", "marg"]`)

## Stack

- **Framework:** Next.js 16 + React 19 + TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **ORM:** Drizzle ORM 0.45
- **Database:** Neon PostgreSQL (serverless)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Auth:** Better Auth + Google OAuth (planned, not implemented)
- **Deploy:** Vercel
- **URL:** https://julius-ten.vercel.app

## Estrutura de pastas

```
src/
├── app/
│   ├── api/
│   │   ├── alerts/route.ts       # GET — deals matching needs
│   │   ├── analytics/[productId]/route.ts # GET — price stats
│   │   ├── dashboard/route.ts
│   │   ├── mcp/route.ts          # MCP Server (OpenClaw tools)
│   │   ├── needs/
│   │   │   ├── route.ts          # GET, POST, PUT, DELETE
│   │   │   └── [id]/route.ts     # GET by ID
│   │   ├── prices/
│   │   │   ├── route.ts          # GET, POST (+ match engine)
│   │   │   └── history/[productId]/route.ts
│   │   ├── products/route.ts     # GET
│   │   ├── receipts/route.ts     # GET, POST (+ auto-create needs)
│   │   └── shopping-list/route.ts # GET, POST, PATCH, DELETE
│   ├── page.tsx                  # Dashboard
│   ├── produtos/page.tsx
│   ├── promocoes/page.tsx
│   ├── notas/page.tsx
│   ├── lista/page.tsx
│   ├── necessidades/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── sidebar.tsx               # Navigation (responsive)
│   ├── stat-card.tsx
│   ├── spending-chart.tsx
│   └── ui/                       # shadcn/ui components
├── db/
│   ├── schema.ts                 # Drizzle schema (8 tables)
│   ├── index.ts                  # Lazy DB init via Proxy
│   └── seed.ts                   # Seed 6 markets
└── lib/
    ├── match-engine.ts           # Fuzzy matching needs ↔ products (fuse.js)
    ├── price-analytics.ts        # Price stats, trend, good deal detection
    ├── utils.ts                  # cn() helper
    └── validation.ts             # sanitize, positiveNumber, positiveInt
```

## Estrutura do banco (Drizzle schema)

| Tabela | Descrição |
|--------|-----------|
| `markets` | 6 mercados de Hortolândia (seeded) |
| `products` | Produtos extraídos de encartes/notas (name, brand, category, unit) |
| `prices` | Preço de um produto em um mercado, com source ("promo" ou "receipt") e validade |
| `receipts` | Notas fiscais registradas (market, total, date, imageUrl) |
| `receiptItems` | Itens de uma nota fiscal (product, quantity, unitPrice, totalPrice) |
| `needs` | Necessidades do usuário — nome, keywords[], preferred[], targetPrice, alertMode |
| `productNeeds` | Link product↔need com confidence score (0-1) |
| `shoppingList` | Lista de compras com checkbox e notas |

### Campos importantes da tabela `needs`

- `keywords: jsonb` — array de strings para match fuzzy (case-insensitive)
- `preferred: jsonb` — marcas preferidas
- `targetPrice: decimal(10,2)` — preço alvo para alertas
- `targetUnit: varchar(50)` — unidade de referência (ex: "500g", "lata", "1L")
- `alertMode: varchar(20)` — "below_target" | "always" | "never"
- `active: boolean` — soft delete

## Mercados (seed)

Atacadão, Tenda Atacado, Assaí Atacadista, Arena Atacado, Morete Supermercados, São Vicente Supermercados

## Padrões do código

- Client components com `"use client"` no topo
- API routes em `src/app/api/` usando Next.js Route Handlers
- Componentes UI do shadcn em `src/components/ui/`
- DB access via Drizzle em `src/db/`
- Todos os textos de UI em **Português BR**
- Comentários de código em **inglês**
- Path alias: `@/*` → `./src/*`
- Decimal prices: stored as `decimal(10,2)`, displayed with `.toFixed(2)`
- Auto-create: APIs aceitam `productName`/`marketName` e criam automaticamente se não existir
- Array support: endpoints de prices/receipts aceitam objeto único ou array

## APIs que o agente Julius consome

### Produtos e Preços (entrada de dados)
- `POST /api/products` — criar produto extraído de encarte
- `POST /api/prices` — registrar preço (source: "promo" ou "receipt"), aceita array
- `POST /api/receipts` — registrar nota fiscal com itens

### Necessidades (match de alertas)
- `GET /api/needs` — buscar necessidades pra fazer match (`?active=true`)
- `GET /api/needs/[id]` — buscar necessidade específica
- `POST /api/needs` — criar necessidade
- `PUT /api/needs` — atualizar necessidade
- `DELETE /api/needs?id=<id>` — soft delete (ou `&hard=true` pra deletar permanente)

### Alertas e Analytics (inteligência)
- `GET /api/alerts` — deals que fazem match com needs (`?market=`, `?needId=`, `?onlyDeals=true`)
- `GET /api/analytics/[productId]` — stats de preço (média, mínimo, tendência, isGoodDeal)

### Consultas
- `GET /api/products?search=<term>&category=<cat>&limit=50` — listar produtos com preços
- `GET /api/prices` — preços recentes (7 dias)
- `GET /api/prices/history/[productId]` — histórico de preços
- `GET /api/dashboard` — stats e resumos
- `GET /api/shopping-list` — lista de compras com melhor preço

### MCP Server (para agentes AI)
- `POST /api/mcp` — Endpoint MCP (Streamable HTTP) com tools:
  - `register_promo_prices` — salvar preços de encartes
  - `register_receipt` — salvar nota fiscal com itens
  - `get_deals` — ver ofertas que fazem match com needs
  - `get_best_price` — encontrar menor preço de um produto
  - `check_market_promos` — promoções válidas de um mercado
  - `get_price_analysis` — análise estatística de preço
  - `manage_need` — criar/atualizar/desativar necessidades
  - `search_products` — buscar produtos cadastrados

## Match Engine (lib/match-engine.ts)

- Usa **fuse.js** para fuzzy matching entre nomes de produtos e keywords das needs
- Roda automaticamente quando um preço é inserido (POST /api/prices)
- Roda automaticamente quando uma nota fiscal é processada (POST /api/receipts)
- Re-roda para todos os produtos quando uma need é criada/atualizada
- Popula a tabela `productNeeds` com score de confiança (0-1)
- Threshold mínimo: 0.5 (50% de confiança)

## Auto-create Needs (POST /api/receipts)

- Quando uma nota fiscal é processada, para cada produto sem need correspondente:
  - Cria need automaticamente com o nome da categoria/produto
  - Define targetPrice = preço de compra atual
  - alertMode = "below_target"
  - Marca com nota "Criado automaticamente a partir de nota fiscal"

## Regras importantes

- Dados vindos de IA podem ter nomes variados (ex: "Marg. Qualy 500g" vs "Margarina Qualy 500g") — tratar com normalização
- Preços sempre em `decimal(10,2)`
- Keywords são **case-insensitive** pro match
- O app é **mobile-first** (grids responsivos: 1 col mobile → 2-3 cols desktop)
- Soft delete padrão para needs (toggle `active`), hard delete opcional
- `productNeeds` é populado automaticamente pelo match engine
- Agente AI (OpenClaw) acessa via MCP Server em `/api/mcp`

## Arquitetura do Ecossistema

```
┌──────────────────────────────────────────────────────┐
│                    JULIUS APP                         │
│  MCP Server (/api/mcp) ←─── OpenClaw (agente AI)    │
│  Match Engine (fuse.js)      via Telegram/N8N        │
│  Price Analytics (SQL)                                │
│  REST API ←────────────────── Web Dashboard          │
│  PostgreSQL (Neon)                                    │
└──────────────────────────────────────────────────────┘

Fluxo:
1. WhatsApp recebe encartes → N8N → OpenClaw (Telegram)
2. OpenClaw extrai produtos/preços via Vision AI
3. OpenClaw chama Julius MCP tools para salvar dados
4. Match engine conecta produtos ↔ necessidades do usuário
5. CRON do OpenClaw chama get_deals para verificar alertas
6. OpenClaw avisa no Telegram quando tem oferta boa
7. Notas fiscais alimentam necessidades automaticamente
```

## Como conectar o OpenClaw ao MCP

URL: `https://julius-ten.vercel.app/api/mcp` (ou `http://localhost:3000/api/mcp` local)
Transport: Streamable HTTP (POST)
Auth: Header `Authorization: Bearer <JULIUS_API_KEY>`

## Environment Variables

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string do Neon PostgreSQL |
| `JULIUS_API_KEY` | API key para acesso do agente/programático |
| `BETTER_AUTH_SECRET` | Secret do Better Auth (sessões) |
| `BETTER_AUTH_URL` | URL base do app (ex: https://julius-ten.vercel.app) |
| `NEXT_PUBLIC_APP_URL` | URL pública do app (usada pelo MCP server internamente) |

## Commands

```bash
pnpm dev          # Dev server
pnpm build        # Build
pnpm db:push      # Push schema to DB
pnpm db:seed      # Seed markets
pnpm db:studio    # Drizzle Studio
```
