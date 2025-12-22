type CoreEnv = {
  DATABASE_URL: string;
  JWT_SECRET: string;
};

type CloudflareEnv = {
  CF_ACCOUNT_ID: string;
  CF_KV_NAMESPACE_ID: string;
  CF_API_TOKEN: string;
};

function requireEnvVars(requiredEnvVars: readonly string[]): void {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) missing.push(envVar);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please check your .env file or environment configuration."
    );
  }
}

export function getCoreEnv(): CoreEnv {
  requireEnvVars(["DATABASE_URL", "JWT_SECRET"]);
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
  };
}

export function getCloudflareEnv(options: { require: boolean }): CloudflareEnv | null {
  const required = ["CF_ACCOUNT_ID", "CF_KV_NAMESPACE_ID", "CF_API_TOKEN"] as const;
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    if (options.require) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}\n` +
          "Cloudflare KV is required in production."
      );
    }
    return null;
  }

  return {
    CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID!,
    CF_KV_NAMESPACE_ID: process.env.CF_KV_NAMESPACE_ID!,
    CF_API_TOKEN: process.env.CF_API_TOKEN!,
  };
}

export const env = getCoreEnv();
