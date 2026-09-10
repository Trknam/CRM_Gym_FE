import crypto from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../db/prisma";

const COOKIE_NAME = "gymcrm_session";
const SESSION_DAYS = 7;

function hashToken(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }

function cookieOptions(expires?: Date) {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax" as const,
    path: "/",
    ...(expires ? { expires } : {}),
  };
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

export async function createSession(userId: string, res: Response) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  res.cookie(COOKIE_NAME, token, cookieOptions(expiresAt));
}

export async function getCurrentUser(req: Request) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  if (!session.user.isActive) return null;
  return session.user;
}

export async function destroySession(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  clearSessionCookie(res);
}