// Environment variable validation
// This module validates required environment variables at startup

const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "CF_ACCOUNT_ID",
  "CF_KV_NAMESPACE_ID",
  "CF_API_TOKEN",
] as const;

interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CF_ACCOUNT_ID: string;
  CF_KV_NAMESPACE_ID: string;
  CF_API_TOKEN: string;
}

function validateEnv(): EnvConfig {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please check your .env file or environment configuration."
    );
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID!,
    CF_KV_NAMESPACE_ID: process.env.CF_KV_NAMESPACE_ID!,
    CF_API_TOKEN: process.env.CF_API_TOKEN!,
  };
}

// Validate on module load
export const env = validateEnv();
