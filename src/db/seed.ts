import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { markets } from "./schema";
import { sql } from "drizzle-orm";

async function seed() {
  const conn = neon(process.env.DATABASE_URL!);
  const db = drizzle(conn);

  const marketData = [
    { name: "Atacadão", loyaltyProgram: "Cartão Atacadão", hasLoyalty: true },
    { name: "Tenda Atacado", loyaltyProgram: null, hasLoyalty: false },
    { name: "Assaí Atacadista", loyaltyProgram: "Passaí", hasLoyalty: true },
    { name: "Arena Atacado", loyaltyProgram: null, hasLoyalty: false },
    { name: "Morete Supermercados", loyaltyProgram: null, hasLoyalty: false },
    { name: "São Vicente Supermercados", loyaltyProgram: "Clube São Vicente", hasLoyalty: false },
  ];

  console.log("🌱 Seeding markets...");
  for (const m of marketData) {
    await db
      .insert(markets)
      .values(m)
      .onConflictDoUpdate({
        target: markets.name,
        set: {
          loyaltyProgram: sql`EXCLUDED.loyalty_program`,
          hasLoyalty: sql`EXCLUDED.has_loyalty`,
        },
      });
  }

  console.log("✅ Seed complete!");
}

seed().catch(console.error);
