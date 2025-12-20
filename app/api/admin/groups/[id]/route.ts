import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { groups, groupChannels, channels } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { invalidateGroupCache } from "@/lib/balancer";
import { eq, inArray } from "drizzle-orm";
import { parseRequestBody, pickAllowedFields, jsonError, jsonSuccess } from "@/lib/utils/api";
import { withTransaction } from "@/lib/db/transaction";

type Params = { params: Promise<{ id: string }> };

// Allowed fields for group update
const ALLOWED_UPDATE_FIELDS = [
  "name",
  "description",
  "balanceStrategy",
  "status",
] as const;

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  const groupId = parseInt(id);

  // Query group
  const groupData = await db.select().from(groups).where(eq(groups.id, groupId)).execute().then(res => res[0]);

  if (!groupData) {
    return jsonError("Not found", 404);
  }

  // Query associated groupChannels
  const groupChannelsList = await db
    .select()
    .from(groupChannels)
    .where(eq(groupChannels.groupId, groupId))
    .execute();

  if (groupChannelsList.length === 0) {
    return jsonSuccess({
      ...groupData,
      groupChannels: [],
    });
  }

  // Query all related channels
  const channelIds = groupChannelsList.map(gc => gc.channelId);
  const channelsList = await db
    .select()
    .from(channels)
    .where(inArray(channels.id, channelIds))
    .execute();

  // Build channel map
  const channelsMap = new Map(channelsList.map(ch => [ch.id, ch]));

  // Build complete group object
  const group = {
    ...groupData,
    groupChannels: groupChannelsList.map(gc => ({
      ...gc,
      channel: channelsMap.get(gc.channelId) || null,
    })),
  };

  return jsonSuccess(group);
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  const groupId = parseInt(id);

  const parsed = await parseRequestBody(request);
  if ("error" in parsed) {
    return parsed.error;
  }

  const body = parsed.data as Record<string, unknown>;
  const { channels: channelConfigs, ...rawGroupData } = body;

  // Only allow specific fields to be updated
  const groupData = pickAllowedFields(rawGroupData as Record<string, unknown>, ALLOWED_UPDATE_FIELDS);

  // Get current group name for cache invalidation
  const current = await db.select().from(groups).where(eq(groups.id, groupId)).execute().then(res => res[0]);

  // Use transaction for update
  await withTransaction(async (tx) => {
    // Update group if there are fields to update
    if (Object.keys(groupData).length > 0) {
      await tx.update(groups).set(groupData).where(eq(groups.id, groupId));
    }

    // Update channel associations if provided
    if (channelConfigs) {
      await tx.delete(groupChannels).where(eq(groupChannels.groupId, groupId));
      const configs = channelConfigs as Array<{ channelId: number; modelMapping?: string; weight?: number; priority?: number }>;
      if (configs.length) {
        await tx.insert(groupChannels).values(
          configs.map((c) => ({
            groupId,
            channelId: c.channelId,
            modelMapping: c.modelMapping,
            weight: c.weight || 1,
            priority: c.priority || 0,
          }))
        );
      }
    }
  });

  // Invalidate cache
  if (current) {
    await invalidateGroupCache(current.name);
  }
  if (groupData.name && groupData.name !== current?.name) {
    await invalidateGroupCache(groupData.name as string);
  }

  return jsonSuccess({ success: true });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  const groupId = parseInt(id);

  // Get group name for cache invalidation
  const group = await db.select().from(groups).where(eq(groups.id, groupId)).execute().then(res => res[0]);

  // Use transaction for cascade delete
  await withTransaction(async (tx) => {
    // Delete associated group channels first
    await tx.delete(groupChannels).where(eq(groupChannels.groupId, groupId));
    // Then delete the group
    await tx.delete(groups).where(eq(groups.id, groupId));
  });

  if (group) {
    await invalidateGroupCache(group.name);
  }

  return jsonSuccess({ success: true });
}
