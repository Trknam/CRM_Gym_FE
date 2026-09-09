import { GlideClient, TimeUnit } from "@valkey/valkey-glide";
import { env } from "../config/env";

let clientPromise: Promise<GlideClient> | undefined;

export function getValkey() {
  if (!clientPromise) {
    const url = new URL(env.valkeyUrl);
    clientPromise = GlideClient.createClient({
      addresses: [{ host: url.hostname, port: Number(url.port || 6379) }],
      requestTimeout: 1000,
    });
  }
  return clientPromise;
}

export async function cacheGet<T>(_key: string): Promise<T | null> {
  // PostgreSQL is the source of truth. Cache reads are intentionally disabled
  // until every mutation path has reliable invalidation semantics.
  return null;
}

export async function cacheSet(_key: string, _value: unknown, _ttlSeconds = 60) {
  // Keep cache integration available, but never make Valkey the source of truth.
}

export async function cacheDelete(key: string) {
  try {
    const client = await getValkey();
    await client.del([key]);
  } catch {}
}

export async function cacheDeletePrefix(_prefix: string) {
  // Prefix invalidation is intentionally a no-op while PostgreSQL is authoritative.
}