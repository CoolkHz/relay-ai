import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requestLogs, dailyStats } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { sql, gte, and, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get summary stats
  const [summary] = await db
    .select({
      totalRequests: sql<number>`count(*)`,
      successRequests: sql<number>`sum(case when status = 'success' then 1 else 0 end)`,
      errorRequests: sql<number>`sum(case when status = 'error' then 1 else 0 end)`,
      totalInputTokens: sql<number>`sum(input_tokens)`,
      totalOutputTokens: sql<number>`sum(output_tokens)`,
      totalCost: sql<number>`sum(cost)`,
      avgLatency: sql<number>`avg(latency)`,
    })
    .from(requestLogs)
    .where(gte(requestLogs.createdAt, startDate));

  // Get daily breakdown
  const dailyBreakdown = await db
    .select({
      date: sql<string>`DATE(created_at)`,
      requests: sql<number>`count(*)`,
      successCount: sql<number>`sum(case when status = 'success' then 1 else 0 end)`,
      inputTokens: sql<number>`sum(input_tokens)`,
      outputTokens: sql<number>`sum(output_tokens)`,
      cost: sql<number>`sum(cost)`,
    })
    .from(requestLogs)
    .where(gte(requestLogs.createdAt, startDate))
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);

  // Get top models
  const topModels = await db
    .select({
      model: requestLogs.requestModel,
      requests: sql<number>`count(*)`,
      tokens: sql<number>`sum(total_tokens)`,
    })
    .from(requestLogs)
    .where(gte(requestLogs.createdAt, startDate))
    .groupBy(requestLogs.requestModel)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  // Get channel stats
  const channelStats = await db
    .select({
      channelId: requestLogs.channelId,
      requests: sql<number>`count(*)`,
      successRate: sql<number>`avg(case when status = 'success' then 1 else 0 end) * 100`,
      avgLatency: sql<number>`avg(latency)`,
    })
    .from(requestLogs)
    .where(gte(requestLogs.createdAt, startDate))
    .groupBy(requestLogs.channelId);

  return Response.json({
    summary: {
      totalRequests: summary.totalRequests || 0,
      successRequests: summary.successRequests || 0,
      errorRequests: summary.errorRequests || 0,
      successRate: summary.totalRequests
        ? ((summary.successRequests || 0) / summary.totalRequests) * 100
        : 0,
      totalInputTokens: summary.totalInputTokens || 0,
      totalOutputTokens: summary.totalOutputTokens || 0,
      totalCost: summary.totalCost || 0,
      avgLatency: Math.round(summary.avgLatency || 0),
    },
    dailyBreakdown,
    topModels,
    channelStats,
  });
}
