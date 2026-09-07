import { NextResponse } from "next/server";

export function apiError(message: string, status = 500) {
  return NextResponse.json({ message }, { status });
}

export function apiErrorFromUnknown(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message.startsWith("INVALID_")
  || message === "MEMBERSHIP_REQUIRED" ? 400 : 500;
  return apiError(fallback, status);
}
