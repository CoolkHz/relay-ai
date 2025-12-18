import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { groups, groupChannels } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { invalidateGroupCache } from "@/lib/balancer";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, parseInt(id)),
    with: { groupChannels: { with: { channel: true } } },
  });

  if (!group) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

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
  const current = await db.query.groups.findFirst({
    where: eq(groups.id, parseInt(id)),
  });

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
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, parseInt(id)),
  });

  await db.delete(groups).where(eq(groups.id, parseInt(id)));

  if (group) {
    await invalidateGroupCache(group.name);
  }

  return Response.json({ success: true });
}
