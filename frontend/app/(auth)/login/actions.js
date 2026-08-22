"use server";

import { createSession, clearSession } from "@/lib/auth";

export async function syncSession(user) {
  try {
    await createSession(user);
    return { success: true };
  } catch (error) {
    console.error("Session creation error:", error);
    return { success: false, error: error.message };
  }
}

export async function clearFrontendSession() {
  await clearSession();
}
