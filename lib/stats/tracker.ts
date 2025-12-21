import { db } from "../db";
import { requestLogs, users, models, apiKeys } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { kv, CacheKeys, CacheTTL } from "../cache/kv";
export { estimateTokens } from "../utils/tokens";

export interface RequestLogData {
  userId: number;
  apiKeyId: number;
  apiKeyHash?: string;
  groupId: number;
  channelId: number;
  requestModel: string;
  actualModel: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  status: "success" | "error";
  errorMessage?: string;
  ip?: string;
}

export async function logRequest(data: RequestLogData): Promise<void> {
  // Insert log
  await db.insert(requestLogs).values({
    userId: data.userId,
    apiKeyId: data.apiKeyId,
    groupId: data.groupId,
    channelId: data.channelId,
    requestModel: data.requestModel,
    actualModel: data.actualModel,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    totalTokens: data.inputTokens + data.outputTokens,
    cost: String(data.cost),
    latency: data.latency,
    status: data.status,
    errorMessage: data.errorMessage,
    ip: data.ip,
  });

  // Update user quota and invalidate cache
  if (data.status === "success") {
    const totalTokens = data.inputTokens + data.outputTokens;
    await db
      .update(users)
      .set({ usedQuota: sql`${users.usedQuota} + ${totalTokens}` })
      .where(eq(users.id, data.userId));

    // Invalidate apiKey cache
    let keyHash = data.apiKeyHash;
    if (!keyHash) {
      const apiKeyRow = await db.query.apiKeys.findFirst({
        where: eq(apiKeys.id, data.apiKeyId),
        columns: { keyHash: true },
      });
      keyHash = apiKeyRow?.keyHash;
    }
    if (keyHash) {
      await kv.delete(CacheKeys.apiKey(keyHash));
    }
  }
}

export function checkQuota(_userId: number, quota: number, usedQuota: number): boolean {
  // 0 means unlimited
  if (quota === 0) return true;
  return usedQuota < quota;
}

export async function getModelPrice(modelName: string): Promise<{ input: number; output: number }> {
  const cached = await kv.get<{ input: number; output: number }>(CacheKeys.modelPrice(modelName));
  if (cached) return cached;

  const modelData = await db.query.models.findFirst({
    where: eq(models.name, modelName),
  });

  const price = {
    input: modelData ? Number(modelData.inputPrice) : 0,
    output: modelData ? Number(modelData.outputPrice) : 0,
  };

  await kv.set(CacheKeys.modelPrice(modelName), price, CacheTTL.modelPrice);
  return price;
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  inputPrice: number,
  outputPrice: number
): number {
  // Price is per 1M tokens
  return (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice;
}

const RATE_LIMIT_WINDOW = 60; // 60 seconds
const RATE_LIMIT_MAX = 60; // 60 requests per minute per user

export async function checkRateLimit(userId: number): Promise<boolean> {
  const window = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW).toString();
  const key = CacheKeys.rateLimit(userId, window);
  const count = await kv.increment(key, 1, RATE_LIMIT_WINDOW);
  return count <= RATE_LIMIT_MAX;
}
