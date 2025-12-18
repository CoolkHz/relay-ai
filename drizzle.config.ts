import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local first, then .env as fallback
config({ path: ".env.local" });
config({ path: ".env" });

// Parse DATABASE_URL or use individual env vars
const url = process.env.DATABASE_URL;
let host = process.env.DB_HOST;
let port = parseInt(process.env.DB_PORT || "4000");
let user = process.env.DB_USER;
let password = process.env.DB_PASSWORD;
let database = process.env.DB_NAME;

if (url) {
  const parsed = new URL(url);
  host = parsed.hostname;
  port = parseInt(parsed.port) || 4000;
  user = parsed.username;
  password = parsed.password;
  database = parsed.pathname.slice(1);
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: host!,
    port,
    user: user!,
    password: password!,
    database: database!,
    ssl: {
      rejectUnauthorized: true,
    },
  },
});
