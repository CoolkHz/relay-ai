import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { apiKeys, users } from "../db/schema";
import { kv, CacheKeys, CacheTTL } from "../cache/kv";

export interface AuthResult {
  userId: number;
  apiKeyId: number;
  status: string;
  role: string;
  quota: number;
  usedQuota: number;
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `sk-${randomBytes(24).toString("hex")}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(key: string | null): Promise<AuthResult | null> {
  if (!key) return null;

  const hash = hashApiKey(key);

  // Check cache first
  const cached = await kv.get<AuthResult>(CacheKeys.apiKey(hash));
  if (cached) {
    if (cached.status !== "active") return null;
    return cached;
  }

  // Query database
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, hash),
    with: { user: true },
  });

  if (!apiKey || apiKey.status !== "active") return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  if (apiKey.user.status !== "active") return null;

  const result: AuthResult = {
    userId: apiKey.userId,
    apiKeyId: apiKey.id,
    status: apiKey.status,
    role: apiKey.user.role,
    quota: Number(apiKey.user.quota),
    usedQuota: Number(apiKey.user.usedQuota),
  };

  // Cache the result
  await kv.set(CacheKeys.apiKey(hash), result, CacheTTL.apiKey);
  return result;
}

export async function invalidateApiKeyCache(keyHash: string): Promise<void> {
  await kv.delete(CacheKeys.apiKey(keyHash));
}
