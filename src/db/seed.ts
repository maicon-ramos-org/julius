import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { markets } from "./schema";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const marketNames = ["Atacadão", "Tenda", "Assaí", "Arena", "Morete", "São Vicente"];

  console.log("🌱 Seeding markets...");
  for (const name of marketNames) {
    await db.insert(markets).values({ name }).onConflictDoNothing();
  }

  console.log("✅ Seed complete!");
}

seed().catch(console.error);
