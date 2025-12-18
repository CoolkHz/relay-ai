import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword } from "@/lib/utils/crypto";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await db.query.users.findMany({
    orderBy: (users, { desc }) => [desc(users.createdAt)],
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

  return Response.json({ data: list });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { username, email, password, role, quota } = body;

  if (!username || !email || !password) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const [result] = await db.insert(users).values({
    username,
    email,
    passwordHash,
    role: role || "user",
    quota: quota || 0,
  });

  return Response.json({ id: result.insertId });
}
