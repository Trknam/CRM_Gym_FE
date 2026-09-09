import crypto from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../db/prisma";

const COOKIE_NAME = "gymcrm_session";
const SESSION_DAYS = 7;

function hashToken(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }

export async function createSession(userId: string, res: Response) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  const secureCookie = process.env.COOKIE_SECURE === "true";
  res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: secureCookie, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function getCurrentUser(req: Request) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null;
  return session.user;
}

export async function destroySession(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", path: "/" });
}