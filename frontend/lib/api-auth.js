import { NextResponse } from "next/server";
import { can, getCurrentUser } from "@/lib/auth";

export async function requireUser(permission) {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  if (permission && !can(user, permission)) {
    return { user: null, response: NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 }) };
  }
  return { user, response: null };
}

export function apiError(error, fallback = "Something went wrong.") {
  console.error(error);
  return NextResponse.json({ error: error.message || fallback }, { status: 400 });
}
