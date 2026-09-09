"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValkey = getValkey;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDelete = cacheDelete;
exports.cacheDeletePrefix = cacheDeletePrefix;
const valkey_glide_1 = require("@valkey/valkey-glide");
const env_1 = require("../config/env");
let clientPromise;
function getValkey() {
    if (!clientPromise) {
        const url = new URL(env_1.env.valkeyUrl);
        clientPromise = valkey_glide_1.GlideClient.createClient({
            addresses: [{ host: url.hostname, port: Number(url.port || 6379) }],
            requestTimeout: 1000,
        });
    }
    return clientPromise;
}
async function cacheGet(_key) {
    // PostgreSQL is the source of truth. Cache reads are intentionally disabled
    // until every mutation path has reliable invalidation semantics.
    return null;
}
async function cacheSet(_key, _value, _ttlSeconds = 60) {
    // Keep cache integration available, but never make Valkey the source of truth.
}
async function cacheDelete(key) {
    try {
        const client = await getValkey();
        await client.del([key]);
    }
    catch { }
}
async function cacheDeletePrefix(_prefix) {
    // Prefix invalidation is intentionally a no-op while PostgreSQL is authoritative.
}
