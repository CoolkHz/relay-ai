import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { generateApiKey, invalidateApiKeyCache } from "@/lib/auth/api-key";
import { eq } from "drizzle-orm";
import { parseRequestBody, jsonError, jsonSuccess } from "@/lib/utils/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  const keys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, parseInt(id)),
    columns: {
      id: true,
      name: true,
      keyPrefix: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return jsonSuccess({ data: keys });
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;

  const parsed = await parseRequestBody(request);
  if ("error" in parsed) {
    return parsed.error;
  }

  const body = parsed.data as Record<string, unknown>;
  const { name, expiresAt } = body;

  if (!name || typeof name !== "string") {
    return jsonError("Name is required");
  }

  const { key, hash, prefix } = generateApiKey();

  await db.insert(apiKeys).values({
    userId: parseInt(id),
    name,
    keyHash: hash,
    keyPrefix: prefix,
    expiresAt: expiresAt ? new Date(expiresAt as string) : null,
  });

  // Return the full key only once
  return jsonSuccess({ key, prefix });
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("keyId");

  if (!keyId) {
    return jsonError("keyId is required");
  }

  // Get key hash for cache invalidation
  const key = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.id, parseInt(keyId)),
  });

  await db.delete(apiKeys).where(eq(apiKeys.id, parseInt(keyId)));

  if (key) {
    await invalidateApiKeyCache(key.keyHash);
  }

  return jsonSuccess({ success: true });
}
