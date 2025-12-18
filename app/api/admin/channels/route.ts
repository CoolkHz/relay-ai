import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { channels } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await db.query.channels.findMany({
    orderBy: (channels, { desc }) => [desc(channels.createdAt)],
  });

  // Hide API keys
  const safeList = list.map((c) => ({ ...c, apiKey: "***" }));
  return Response.json({ data: safeList });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, type, baseUrl, apiKey, models, weight, priority, timeout } = body;

  if (!name || !type || !baseUrl || !apiKey) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [result] = await db.insert(channels).values({
    name,
    type,
    baseUrl,
    apiKey,
    models: models || [],
    weight: weight || 1,
    priority: priority || 0,
    timeout: timeout || 60000,
  });

  return Response.json({ id: result.insertId });
}
