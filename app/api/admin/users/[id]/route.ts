import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword } from "@/lib/utils/crypto";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(user);
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Hash password if provided
  if (body.password) {
    body.passwordHash = await hashPassword(body.password);
    delete body.password;
  }

  await db.update(users).set(body).where(eq(users.id, parseInt(id)));
  return Response.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(users).where(eq(users.id, parseInt(id)));
  return Response.json({ success: true });
}
