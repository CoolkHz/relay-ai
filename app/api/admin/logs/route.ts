import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requestLogs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import { jsonError, jsonSuccess } from "@/lib/utils/api";

// Maximum limit for pagination
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const userId = searchParams.get("userId");
  const channelId = searchParams.get("channelId");
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const conditions = [];

  if (userId) {
    conditions.push(eq(requestLogs.userId, parseInt(userId)));
  }
  if (channelId) {
    conditions.push(eq(requestLogs.channelId, parseInt(channelId)));
  }
  if (status) {
    conditions.push(eq(requestLogs.status, status as "success" | "error"));
  }
  if (startDate) {
    conditions.push(gte(requestLogs.createdAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(requestLogs.createdAt, new Date(endDate)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, countResult] = await Promise.all([
    db.query.requestLogs.findMany({
      where,
      orderBy: [desc(requestLogs.createdAt)],
      limit,
      offset: (page - 1) * limit,
    }),
    db.select({ count: sql<number>`count(*)` }).from(requestLogs).where(where),
  ]);

  return jsonSuccess({
    data: logs,
    pagination: {
      page,
      limit,
      total: countResult[0]?.count || 0,
    },
  });
}
