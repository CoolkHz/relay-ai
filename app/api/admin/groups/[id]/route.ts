import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { groups, groupChannels, channels } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { invalidateGroupCache } from "@/lib/balancer";
import { eq, inArray } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const groupId = parseInt(id);
  
  // 分步查询：先查询group
  const groupData = await db.select().from(groups).where(eq(groups.id, groupId)).execute().then(res => res[0]);
  
  if (!groupData) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  
  // 查询关联的groupChannels
  const groupChannelsList = await db
    .select()
    .from(groupChannels)
    .where(eq(groupChannels.groupId, groupId))
    .execute();
  
  if (groupChannelsList.length === 0) {
    // 没有关联的渠道
    return Response.json({
      ...groupData,
      groupChannels: [],
    });
  }
  
  // 查询所有相关的channels
  const channelIds = groupChannelsList.map(gc => gc.channelId);
  const channelsList = await db
    .select()
    .from(channels)
    .where(inArray(channels.id, channelIds))
    .execute();
  
  // 构建channel映射
  const channelsMap = new Map(channelsList.map(ch => [ch.id, ch]));
  
  // 构建完整的group对象
  const group = {
    ...groupData,
    groupChannels: groupChannelsList.map(gc => ({
      ...gc,
      channel: channelsMap.get(gc.channelId) || null,
    })),
  };

  return Response.json(group);
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { channels: channelConfigs, ...groupData } = body;

  // Get current group name for cache invalidation
  const current = await db.select().from(groups).where(eq(groups.id, parseInt(id))).execute().then(res => res[0]);

  // Update group
  await db.update(groups).set(groupData).where(eq(groups.id, parseInt(id)));

  // Update channel associations if provided
  if (channelConfigs) {
    await db.delete(groupChannels).where(eq(groupChannels.groupId, parseInt(id)));
    if (channelConfigs.length) {
      await db.insert(groupChannels).values(
        channelConfigs.map((c: { channelId: number; modelMapping?: string; weight?: number; priority?: number }) => ({
          groupId: parseInt(id),
          channelId: c.channelId,
          modelMapping: c.modelMapping,
          weight: c.weight || 1,
          priority: c.priority || 0,
        }))
      );
    }
  }

  // Invalidate cache
  if (current) {
    await invalidateGroupCache(current.name);
  }
  if (body.name && body.name !== current?.name) {
    await invalidateGroupCache(body.name);
  }

  return Response.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Get group name for cache invalidation
  const group = await db.select().from(groups).where(eq(groups.id, parseInt(id))).execute().then(res => res[0]);

  await db.delete(groups).where(eq(groups.id, parseInt(id)));

  if (group) {
    await invalidateGroupCache(group.name);
  }

  return Response.json({ success: true });
}
