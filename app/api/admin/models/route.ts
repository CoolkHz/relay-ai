import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { models } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { kv, CacheKeys } from "@/lib/cache/kv";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await db.query.models.findMany({
    orderBy: (models, { asc }) => [asc(models.name)],
  });

  return Response.json({ data: list });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, inputPrice, outputPrice } = body;

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  // Check if model exists
  const existing = await db.query.models.findFirst({
    where: eq(models.name, name),
  });

  if (existing) {
    // Update
    await db
      .update(models)
      .set({
        inputPrice: String(inputPrice || 0),
        outputPrice: String(outputPrice || 0),
        source: "manual",
      })
      .where(eq(models.name, name));
  } else {
    // Insert
    await db.insert(models).values({
      name,
      inputPrice: String(inputPrice || 0),
      outputPrice: String(outputPrice || 0),
      source: "manual",
    });
  }

  // Invalidate cache
  await kv.delete(CacheKeys.modelPrice(name));

  return Response.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  await db.delete(models).where(eq(models.name, name));
  await kv.delete(CacheKeys.modelPrice(name));

  return Response.json({ success: true });
}
