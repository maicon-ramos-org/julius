import { pgTable, serial, text, varchar, decimal, timestamp, boolean, integer, date, jsonb } from "drizzle-orm/pg-core";

export const markets = pgTable("markets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  loyaltyProgram: varchar("loyalty_program", { length: 255 }),
  hasLoyalty: boolean("has_loyalty").default(false).notNull(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 20 }),
  unitType: varchar("unit_type", { length: 10 }), // "kg", "g", "L", "mL", "un"
  unitQuantity: decimal("unit_quantity", { precision: 10, scale: 3 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const prices = pgTable("prices", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  marketId: integer("market_id").notNull().references(() => markets.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  source: varchar("source", { length: 10 }).notNull().default("promo"), // 'promo' | 'receipt'
  priceType: varchar("price_type", { length: 20 }).notNull().default("regular"), // 'regular' | 'loyalty' | 'bulk'
  normalizedPrice: decimal("normalized_price", { precision: 10, scale: 4 }),
  normalizedUnit: varchar("normalized_unit", { length: 10 }), // "kg", "L", "un"
  promoValidUntil: timestamp("promo_valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").notNull().references(() => markets.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const receiptItems = pgTable("receipt_items", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id").notNull().references(() => receipts.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

// Necessidades inteligentes — o que o usuário PRECISA comprar (categoria, não SKU)
export const needs = pgTable("needs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // ex: "Margarina", "Cerveja", "Batata Frita"
  category: varchar("category", { length: 100 }), // ex: "Laticínios", "Bebidas", "Congelados"
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]), // ex: ["margarina", "manteiga"]
  preferred: jsonb("preferred").$type<string[]>().default([]), // ex: ["margarina"] — preferências
  targetPrice: decimal("target_price", { precision: 10, scale: 2 }), // preço alvo (bom pra comprar)
  targetUnit: varchar("target_unit", { length: 50 }), // ex: "500g", "1L", "2kg", "lata"
  alertMode: varchar("alert_mode", { length: 20 }).notNull().default("below_target"), // 'below_target' | 'always' | 'never'
  active: boolean("active").default(true).notNull(),
  notes: text("notes"), // observações do usuário
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Liga produtos encontrados às necessidades do usuário
export const productNeeds = pgTable("product_needs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  needId: integer("need_id").notNull().references(() => needs.id),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).default("1.00"), // 0.00-1.00
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shoppingList = pgTable("shopping_list", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).default("1"),
  notes: text("notes"),
  checked: boolean("checked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Logs de inserções para rastrear atividades de entrada de dados
export const insertionLogs = pgTable("insertion_logs", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 50 }).notNull(), // 'price_insert', 'receipt_insert', 'product_create', etc
  source: varchar("source", { length: 30 }).notNull(), // 'api', 'manual', 'promo_scan', 'receipt_scan'
  marketName: varchar("market_name", { length: 255 }), // nome do mercado (quando aplicável)
  summary: text("summary").notNull(), // resumo legível da operação
  details: jsonb("details"), // detalhes completos da operação
  itemCount: integer("item_count").default(0).notNull(), // quantidade de itens inseridos
  promoValidUntil: timestamp("promo_valid_until"), // validade da promoção (quando aplicável)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
