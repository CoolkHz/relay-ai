import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { groups, groupChannels, channels } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { desc, eq } from "drizzle-orm";
import { parseRequestBody, jsonError, jsonSuccess } from "@/lib/utils/api";
import { groupSchema, validateForm } from "@/lib/validations";
import { withTransaction } from "@/lib/db/transaction";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
  }

  // Fetch groups
  const groupList = await db
    .select()
    .from(groups)
    .orderBy(desc(groups.createdAt));

  // Fetch all group channels with their channel info
  const groupChannelList = await db
    .select({
      groupChannel: groupChannels,
      channel: channels,
    })
    .from(groupChannels)
    .leftJoin(channels, eq(groupChannels.channelId, channels.id));

  // Map channels to their groups
  const groupChannelMap = new Map<number, Array<typeof groupChannelList[0]>>();
  for (const gc of groupChannelList) {
    const existing = groupChannelMap.get(gc.groupChannel.groupId) || [];
    existing.push(gc);
    groupChannelMap.set(gc.groupChannel.groupId, existing);
  }

  // Combine results
  const list = groupList.map((group) => ({
    ...group,
    groupChannels: (groupChannelMap.get(group.id) || []).map((gc) => ({
      ...gc.groupChannel,
      channel: gc.channel,
    })),
  }));

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
  const channelConfigs = body.channels as Array<{
    channelId: number;
    modelMapping?: string;
    weight?: number;
    priority?: number;
  }> | undefined;

  // Prepare form data for validation
  const formData = {
    name: body.name,
    description: body.description || "",
    balanceStrategy: body.balanceStrategy || "round_robin",
    channels: channelConfigs,
  };

  const validation = validateForm(groupSchema, formData);
  if (!validation.success) {
    return jsonError(Object.values(validation.errors)[0]);
  }

  const { name, description, balanceStrategy } = validation.data;

  // Use transaction for group + channels creation
  const groupId = await withTransaction(async (tx) => {
    // Create group
    const [result] = await tx.insert(groups).values({
      name,
      description,
      balanceStrategy,
    });

    const newGroupId = Number(result.insertId);

    // Add channel associations
    if (channelConfigs?.length) {
      await tx.insert(groupChannels).values(
        channelConfigs.map((c) => ({
          groupId: newGroupId,
          channelId: c.channelId,
          modelMapping: c.modelMapping,
          weight: c.weight || 1,
          priority: c.priority || 0,
        }))
      );
    }

    return newGroupId;
  });

  return jsonSuccess({ id: groupId });
}
