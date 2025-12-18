import { config } from "dotenv";
import mysql from "mysql2/promise";

config({ path: ".env.local" });
config({ path: ".env" });

async function createDatabase() {
  const url = process.env.DATABASE_URL!;
  const parsed = new URL(url);
  const database = parsed.pathname.slice(1);

  // Connect without database
  parsed.pathname = "/";

  const connection = await mysql.createConnection({
    uri: parsed.toString(),
    ssl: { rejectUnauthorized: true },
  });

  console.log(`Creating database: ${database}`);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  console.log("Database created successfully!");

  await connection.end();
  process.exit(0);
}

createDatabase().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
