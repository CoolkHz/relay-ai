import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { channels, groupChannels } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { parseRequestBody, pickAllowedFields, jsonError, jsonSuccess } from "@/lib/utils/api";
import { withTransaction } from "@/lib/db/transaction";

type Params = { params: Promise<{ id: string }> };

// Allowed fields for channel update
const ALLOWED_UPDATE_FIELDS = [
  "name",
  "type",
  "baseUrl",
  "apiKey",
  "models",
  "status",
  "weight",
  "priority",
  "maxRetries",
  "timeout",
] as const;

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  const channel = await db.query.channels.findFirst({
    where: eq(channels.id, parseInt(id)),
  });

  if (!channel) {
    return jsonError("Not found", 404);
  }

  return jsonSuccess({ ...channel, apiKey: "***" });
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

  // Don't update apiKey if it's masked
  if (body.apiKey === "***") {
    delete body.apiKey;
  }

  // Only allow specific fields to be updated
  const updateData = pickAllowedFields(body, ALLOWED_UPDATE_FIELDS);

  if (Object.keys(updateData).length === 0) {
    return jsonError("No valid fields to update");
  }

  await db.update(channels).set(updateData).where(eq(channels.id, parseInt(id)));
  return jsonSuccess({ success: true });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  const channelId = parseInt(id);

  // Use transaction for cascade delete
  await withTransaction(async (tx) => {
    // Delete associated group channels first
    await tx.delete(groupChannels).where(eq(groupChannels.channelId, channelId));
    // Then delete the channel
    await tx.delete(channels).where(eq(channels.id, channelId));
  });

  return jsonSuccess({ success: true });
}
