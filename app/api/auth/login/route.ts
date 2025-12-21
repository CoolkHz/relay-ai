import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/utils/crypto";
import { signToken } from "@/lib/auth/session";
import { eq, or } from "drizzle-orm";
import { parseRequestBody, jsonError } from "@/lib/utils/api";

export async function POST(request: NextRequest) {
  const parsed = await parseRequestBody(request);
  if ("error" in parsed) {
    return parsed.error;
  }

  const body = parsed.data as Record<string, unknown>;
  const username = body.username as string | undefined;
  const password = body.password as string | undefined;

  if (!username || !password) {
    return jsonError("Username and password are required");
  }

  // Find user by username or email
  const user = await db.query.users.findFirst({
    where: or(eq(users.username, username), eq(users.email, username)),
  });

  if (!user) {
    return jsonError("Invalid credentials", 401);
  }

  if (user.status !== "active") {
    return jsonError("Account is disabled", 403);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return jsonError("Invalid credentials", 401);
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });

  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
