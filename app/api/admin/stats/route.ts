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
  const daysParam = Number(searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 7;

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

  const summaryData =
    summary ?? {
      totalRequests: 0,
      successRequests: 0,
      errorRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      avgLatency: 0,
    };

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
      totalRequests: summaryData.totalRequests || 0,
      successRequests: summaryData.successRequests || 0,
      errorRequests: summaryData.errorRequests || 0,
      successRate: summaryData.totalRequests
        ? ((summaryData.successRequests || 0) / summaryData.totalRequests) * 100
        : 0,
      totalInputTokens: summaryData.totalInputTokens || 0,
      totalOutputTokens: summaryData.totalOutputTokens || 0,
      totalCost: summaryData.totalCost || 0,
      avgLatency: Math.round(summaryData.avgLatency || 0),
    },
    dailyBreakdown,
    topModels,
    channelStats,
  });
}
