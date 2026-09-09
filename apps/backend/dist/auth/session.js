"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getCurrentUser = getCurrentUser;
exports.destroySession = destroySession;
const node_crypto_1 = __importDefault(require("node:crypto"));
const prisma_1 = require("../db/prisma");
const COOKIE_NAME = "gymcrm_session";
const SESSION_DAYS = 7;
function hashToken(token) { return node_crypto_1.default.createHash("sha256").update(token).digest("hex"); }
async function createSession(userId, res) {
    const token = node_crypto_1.default.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
    await prisma_1.prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
    const secureCookie = process.env.COOKIE_SECURE === "true";
    res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: secureCookie, sameSite: "lax", path: "/", expires: expiresAt });
}
async function getCurrentUser(req) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token)
        return null;
    const session = await prisma_1.prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date() || !session.user.isActive)
        return null;
    return session.user;
}
async function destroySession(req, res) {
    const token = req.cookies?.[COOKIE_NAME];
    if (token)
        await prisma_1.prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", path: "/" });
}
