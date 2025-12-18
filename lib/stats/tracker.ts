import { db } from "../db";
import { requestLogs, users } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { kv, CacheKeys, CacheTTL } from "../cache/kv";

export interface RequestLogData {
  userId: number;
  apiKeyId: number;
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

  // Update user quota
  if (data.status === "success") {
    const totalTokens = data.inputTokens + data.outputTokens;
    await db
      .update(users)
      .set({ usedQuota: sql`${users.usedQuota} + ${totalTokens}` })
      .where(eq(users.id, data.userId));

    // Invalidate quota cache
    await kv.delete(CacheKeys.userQuota(data.userId));
  }
}

export async function checkQuota(userId: number, quota: number, usedQuota: number): Promise<boolean> {
  // 0 means unlimited
  if (quota === 0) return true;
  return usedQuota < quota;
}

export async function getModelPrice(model: string): Promise<{ input: number; output: number }> {
  const cached = await kv.get<{ input: number; output: number }>(CacheKeys.modelPrice(model));
  if (cached) return cached;

  const modelData = await db.query.models.findFirst({
    where: eq(db.query.models.findFirst.arguments, model),
  });

  const price = {
    input: modelData ? Number(modelData.inputPrice) : 0,
    output: modelData ? Number(modelData.outputPrice) : 0,
  };

  await kv.set(CacheKeys.modelPrice(model), price, CacheTTL.modelPrice);
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

export function estimateTokens(text: string): number {
  // Simple estimation: ~4 chars per token for English, ~2 for Chinese
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}
