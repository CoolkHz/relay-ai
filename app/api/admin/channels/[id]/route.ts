import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { channels } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const channel = await db.query.channels.findFirst({
    where: eq(channels.id, parseInt(id)),
  });

  if (!channel) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ ...channel, apiKey: "***" });
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Don't update apiKey if it's masked
  if (body.apiKey === "***") {
    delete body.apiKey;
  }

  await db.update(channels).set(body).where(eq(channels.id, parseInt(id)));
  return Response.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(channels).where(eq(channels.id, parseInt(id)));
  return Response.json({ success: true });
}
