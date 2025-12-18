import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: {
      id: true,
      username: true,
      email: true,
      role: true,
      quota: true,
      usedQuota: true,
    },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({ user });
}
