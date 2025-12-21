import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { apiKeys, users } from "../db/schema";
import { kv, CacheKeys, CacheTTL } from "../cache/kv";

export interface AuthResult {
  userId: number;
  apiKeyId: number;
  keyHash: string;
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

  // Query database using inner join (TiDB compatible, no lateral join)
  const rows = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      status: apiKeys.status,
      expiresAt: apiKeys.expiresAt,
      userRole: users.role,
      userStatus: users.status,
      userQuota: users.quota,
      userUsedQuota: users.usedQuota,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);

  const apiKey = rows[0];
  if (!apiKey || apiKey.status !== "active") return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  if (apiKey.userStatus !== "active") return null;

  const result: AuthResult = {
    userId: apiKey.userId,
    apiKeyId: apiKey.id,
    keyHash: hash,
    status: apiKey.status,
    role: apiKey.userRole,
    quota: Number(apiKey.userQuota),
    usedQuota: Number(apiKey.userUsedQuota),
  };

  // Cache the result
  await kv.set(CacheKeys.apiKey(hash), result, CacheTTL.apiKey);
  return result;
}

export async function invalidateApiKeyCache(keyHash: string): Promise<void> {
  await kv.delete(CacheKeys.apiKey(keyHash));
}
