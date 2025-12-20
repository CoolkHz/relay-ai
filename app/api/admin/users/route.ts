import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword } from "@/lib/utils/crypto";
import { parseRequestBody, jsonError, jsonSuccess } from "@/lib/utils/api";
import { userCreateSchema, validateForm } from "@/lib/validations";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Unauthorized", 401);
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

  // Prepare form data for validation
  const formData = {
    username: body.username,
    email: body.email,
    password: body.password,
    role: body.role || "user",
    quota: String(body.quota || 0),
  };

  const validation = validateForm(userCreateSchema, formData);
  if (!validation.success) {
    return jsonError(Object.values(validation.errors)[0]);
  }

  const { username, email, password, role, quota } = validation.data;

  const passwordHash = await hashPassword(password);

  const [result] = await db.insert(users).values({
    username,
    email,
    passwordHash,
    role,
    quota: parseInt(quota),
  });

  return jsonSuccess({ id: result.insertId });
}
