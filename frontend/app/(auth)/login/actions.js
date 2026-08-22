"use server";

import { createSession, clearSession } from "@/lib/auth";

export async function syncSession(user) {
  await createSession(user);
}

export async function clearFrontendSession() {
  await clearSession();
}
