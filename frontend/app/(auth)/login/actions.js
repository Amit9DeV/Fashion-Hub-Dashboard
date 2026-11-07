"use server";

import { createSession, clearSession } from "@/lib/auth";

export async function syncSession(user) {
  try {
    const token = await createSession(user);
    return { success: true, token };
  } catch (error) {
    console.error("Session creation error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function clearFrontendSession() {
  try {
    await clearSession();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
