import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { groups, groupChannels, channels } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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

  return Response.json({ data: list });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, balanceStrategy, channels: channelConfigs } = body;

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  // Create group
  const [result] = await db.insert(groups).values({
    name,
    description,
    balanceStrategy: balanceStrategy || "round_robin",
  });

  const groupId = result.insertId;

  // Add channel associations
  if (channelConfigs?.length) {
    await db.insert(groupChannels).values(
      channelConfigs.map((c: { channelId: number; modelMapping?: string; weight?: number; priority?: number }) => ({
        groupId: Number(groupId),
        channelId: c.channelId,
        modelMapping: c.modelMapping,
        weight: c.weight || 1,
        priority: c.priority || 0,
      }))
    );
  }

  return Response.json({ id: groupId });
}
