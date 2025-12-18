import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/utils/crypto";
import { signToken } from "@/lib/auth/session";
import { eq, or } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return Response.json({ error: "Username and password are required" }, { status: 400 });
  }

  // Find user by username or email
  const user = await db.query.users.findFirst({
    where: or(eq(users.username, username), eq(users.email, username)),
  });

  if (!user) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.status !== "active") {
    return Response.json({ error: "Account is disabled" }, { status: 403 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
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
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
