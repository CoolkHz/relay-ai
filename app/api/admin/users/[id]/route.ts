import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, apiKeys, requestLogs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword } from "@/lib/utils/crypto";
import { eq } from "drizzle-orm";
import { parseRequestBody, pickAllowedFields, jsonError, jsonSuccess } from "@/lib/utils/api";
import { withTransaction } from "@/lib/db/transaction";

type Params = { params: Promise<{ id: string }> };

// Allowed fields for user update
const ALLOWED_UPDATE_FIELDS = [
  "username",
  "email",
  "role",
  "status",
  "quota",
] as const;

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  const user = await db.query.users.findFirst({
    where: eq(users.id, parseInt(id)),
    columns: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      quota: true,
      usedQuota: true,
      createdAt: true,
    },
  });

  if (!user) {
    return jsonError("Not found", 404);
  }

  return jsonSuccess(user);
}

export async function PUT(request: NextRequest, { params }: Params) {
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

  // Only allow specific fields to be updated
  const updateData: Record<string, unknown> = pickAllowedFields(body, ALLOWED_UPDATE_FIELDS);

  // Hash password if provided
  if (body.password && typeof body.password === "string") {
    updateData.passwordHash = await hashPassword(body.password);
  }

  if (Object.keys(updateData).length === 0) {
    return jsonError("No valid fields to update");
  }

  await db.update(users).set(updateData).where(eq(users.id, parseInt(id)));
  return jsonSuccess({ success: true });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  const userId = parseInt(id);

  // Use transaction for cascade delete
  await withTransaction(async (tx) => {
    // Delete associated API keys first
    await tx.delete(apiKeys).where(eq(apiKeys.userId, userId));
    // Set requestLogs userId to null (keep logs for audit)
    await tx.update(requestLogs).set({ userId: null }).where(eq(requestLogs.userId, userId));
    // Then delete the user
    await tx.delete(users).where(eq(users.id, userId));
  });

  return jsonSuccess({ success: true });
}
