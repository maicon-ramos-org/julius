## Glossary & Domain Concepts

This glossary defines key terminology used throughout the Julius shopping optimization platform. The application focuses on helping users manage household needs, track purchases via receipts, analyze product prices, generate smart shopping lists, and receive deal alerts. Core domain entities include **Needs** (user-defined required items), **Products** (items extracted from receipts or external sources), **Receipts** (scanned fiscal notes or purchase records), **Prices** (historical and current pricing data), and **Shopping Lists** (dynamically generated lists matching needs to available products and deals).

User personas include the **Primary Shopper** (household manager tracking expenses and needs) and **Family Member** (contributor to needs or receipt uploads). The system employs a **Match Engine** to semantically link products to needs and a **Price Analytics** module for deal detection and trend analysis. See [project-overview.md](./project-overview.md) for architectural details.

## Type Definitions

- **`ProductStats`** ([src/lib/price-analytics.ts](../src/lib/price-analytics.ts#L5)): Aggregated statistics for a product, including average price, trend, and deal probability. Used in dashboard analytics and price history APIs.
- **`NeedRecord`** ([src/lib/match-engine.ts](../src/lib/match-engine.ts#L6)): Represents a user's need with fields like name, quantity, category, and fulfillment status. Core to matching logic.
- **`MatchResult`** ([src/lib/match-engine.ts](../src/lib/match-engine.ts#L13)): Output of product-to-need matching, including confidence score, matched need, and persistence flags.
- **`DealInfo`** ([src/app/api/alerts/route.ts](../src/app/api/alerts/route.ts#L7)): Structure for deal notifications, containing product details, current price, historical best, and alert metadata.
- **`StatCardProps`** ([src/components/stat-card.tsx](../src/components/stat-card.tsx#L4)): Props for dashboard stat cards, including value, label, trend, and icon.
- **`SpendingData`** ([src/components/spending-chart.tsx](../src/components/spending-chart.tsx#L6)): Data for spending visualizations, with time-series spend amounts and categories.
- **`DashboardData`** ([src/app/page.tsx](../src/app/page.tsx#L10)): Comprehensive dashboard payload, aggregating stats, recent matches, alerts, and charts.
- **`Promo`** ([src/app/promocoes/page.tsx](../src/app/promocoes/page.tsx#L8)): Promotion entity with details like product, discount, store, and expiry.
- **`Product`** ([src/app/produtos/page.tsx](../src/app/produtos/page.tsx#L9)): Product record from receipts or catalogs, including name, price, quantity, store, and date.
- **`ReceiptData`** ([src/app/notas/page.tsx](../src/app/notas/page.tsx#L7)): Parsed receipt data, listing products, totals, and metadata like store and date.
- **`Need`** ([src/app/necessidades/page.tsx](../src/app/necessidades/page.tsx#L28)): Frontend representation of a need, extendable for UI with urgency, notes, and match status.
- **`ShoppingItem`** ([src/app/lista/page.tsx](../src/app/lista/page.tsx#L9)): Item in the generated shopping list, linking need, suggested product, best price, and quantity.

## Enumerations

No exported enums are defined in the codebase. Matching and status logic uses string literals or boolean flags (e.g., fulfillment status in `NeedRecord`).

## Core Terms

- **Need**: A user-specified item or category required for purchase (e.g., "milk, 2L"). Surfaces in `/api/needs` routes, match-engine.ts, and necessidades/page.tsx. Relevance: Drives shopping list generation and product matching.
- **Product**: An item captured from receipts or external sources, with price and context. Used across `/api/products`, `/api/prices`, produtos/page.tsx. Relevance: Input to price analytics and matching.
- **Receipt**: Fiscal note or purchase record, parsed for products and prices. Handled in `/api/receipts`, notas/page.tsx. Relevance: Primary data source for historical pricing.
- **Match Engine**: Logic in match-engine.ts (`matchProductToNeeds`, `getActiveNeeds`) that semantically links products to needs using similarity scoring. Relevance: Automates shopping list population.
- **Price Analytics**: Module in price-analytics.ts (`getProductStats`, `isGoodDeal`, `getBestPrice`) computing trends, normalized prices, and deal thresholds. Relevance: Powers alerts, dashboard, and decision-making.
- **Shopping List**: Dynamic list in lista/page.tsx, derived from active needs and best matches. Managed via `/api/shopping-list` CRUD routes.
- **Deal**: Product priced below historical average or threshold, flagged by `isGoodDeal`. Triggers alerts via `/api/alerts`.

## Acronyms & Abbreviations

- **MCP**: Mercado Checkout Partner (inferred from `/api/mcp` routes). Handles external integration for payments or product catalogs via POST/GET/DELETE handlers.
- **NF**: Nota Fiscal (receipts/notas). Brazilian fiscal receipts parsed for products and prices.

## Personas / Actors

- **Primary Shopper**: Household lead managing weekly needs, uploading receipts, and reviewing dashboards/alerts. Goals: Minimize spending, track trends. Workflows: Define needs → upload receipt → review shopping list/deals. Pain points addressed: Manual price comparison, forgotten needs, overspending.
- **Family Contributor**: Adds needs or receipts via mobile/web. Goals: Quick input without full access. Workflows: POST to `/api/needs` or `/api/receipts`.

## Domain Rules & Invariants

- **Validation**: Prices/quantities must be positive (`positiveNumber`, `positiveInt` in validation.ts). Inputs sanitized via `sanitize`.
- **Matching**: Products match needs if similarity > threshold (implicit in match-engine.ts). Unfulfilled needs remain active.
- **Pricing**: Normalized prices account for quantity/unit (`calcNormalized` in prices/route.ts). Good deals: current price < 80% of avg (tuned in `isGoodDeal`).
- **Persistence**: Matches auto-persist via `matchAndPersist`; full rematch via `rematchAllProducts`.
- **Localization**: Brazilian focus (e.g., Nota Fiscal parsing, Portuguese UI paths like promocoes/produtos). No explicit region rules, but prices in BRL assumed.
- **Security**: Auth middleware enforces access; safe errors hide internals (`safeError`).

## Related Resources

- [project-overview.md](./project-overview.md)
