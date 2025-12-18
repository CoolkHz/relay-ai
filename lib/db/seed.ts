import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users } from "./schema";
import { hashPassword } from "../utils/crypto";
import { eq } from "drizzle-orm";

async function seed() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminEmail || !adminPassword) {
    console.error("Error: Missing required environment variables:");
    console.error("  ADMIN_USERNAME:", adminUsername ? "✓" : "✗");
    console.error("  ADMIN_EMAIL:", adminEmail ? "✓" : "✗");
    console.error("  ADMIN_PASSWORD:", adminPassword ? "✓" : "✗");
    console.error("\nPlease set these in your .env.local file");
    process.exit(1);
  }

  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: true },
  });

  const db = drizzle(pool, { mode: "default" });

  console.log("Seeding database...");

  const passwordHash = await hashPassword(adminPassword);

  // Check if user exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, adminUsername))
    .limit(1);

  if (existing) {
    // Update existing user
    await db
      .update(users)
      .set({ passwordHash, role: "admin", email: adminEmail })
      .where(eq(users.username, adminUsername));
    console.log(`Admin user updated: ${adminUsername}`);
  } else {
    // Insert new user
    await db.insert(users).values({
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      role: "admin",
      quota: 0,
    });
    console.log(`Admin user created: ${adminUsername}`);
  }

  console.log("Seeding complete!");

  await pool.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
