import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { models } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { kv, CacheKeys } from "@/lib/cache/kv";
import { parseRequestBody, jsonError, jsonSuccess } from "@/lib/utils/api";
import { modelSchema, validateForm } from "@/lib/validations";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const list = await db.query.models.findMany({
    orderBy: (models, { asc }) => [asc(models.name)],
  });

  return jsonSuccess({ data: list });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const parsed = await parseRequestBody(request);
  if ("error" in parsed) {
    return parsed.error;
  }

  const body = parsed.data as Record<string, unknown>;

  // Prepare form data for validation
  const formData = {
    name: body.name,
    inputPrice: String(body.inputPrice || 0),
    outputPrice: String(body.outputPrice || 0),
  };

  const validation = validateForm(modelSchema, formData);
  if (!validation.success) {
    return jsonError(Object.values(validation.errors)[0]);
  }

  const { name, inputPrice, outputPrice } = validation.data;

  // Check if model exists
  const existing = await db.query.models.findFirst({
    where: eq(models.name, name),
  });

  if (existing) {
    // Update
    await db
      .update(models)
      .set({
        inputPrice,
        outputPrice,
        source: "manual",
      })
      .where(eq(models.name, name));
  } else {
    // Insert
    await db.insert(models).values({
      name,
      inputPrice,
      outputPrice,
      source: "manual",
    });
  }

  // Invalidate cache
  await kv.delete(CacheKeys.modelPrice(name));

  return jsonSuccess({ success: true });
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return jsonError("Name is required");
  }

  await db.delete(models).where(eq(models.name, name));
  await kv.delete(CacheKeys.modelPrice(name));

  return jsonSuccess({ success: true });
}
