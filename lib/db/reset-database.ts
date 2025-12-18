import { config } from "dotenv";
import mysql from "mysql2/promise";

config({ path: ".env.local" });
config({ path: ".env" });

async function resetDatabase() {
  const url = process.env.DATABASE_URL!;
  const parsed = new URL(url);
  const database = parsed.pathname.slice(1);

  // Connect without database
  parsed.pathname = "/";

  const connection = await mysql.createConnection({
    uri: parsed.toString(),
    ssl: { rejectUnauthorized: true },
  });

  console.log(`Dropping database: ${database}`);
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);

  console.log(`Creating database: ${database}`);
  await connection.query(`CREATE DATABASE \`${database}\``);

  console.log("Database reset successfully!");

  await connection.end();
  process.exit(0);
}

resetDatabase().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
