import { getCloudflareEnv } from "../env";
import type { KVStore } from "./store";
import { CloudflareKVStore } from "./stores/cloudflare";
import { MemoryKVStore } from "./stores/memory";

// Cache Key Patterns
export const CacheKeys = {
  apiKey: (hash: string) => `apikey:${hash}`,
  group: (name: string) => `group:${name}`,
  channelHealth: (channelId: number) => `health:${channelId}`,
  roundRobinCounter: (groupId: number) => `rr:${groupId}`,
  userQuota: (userId: number) => `quota:${userId}`,
  modelPrice: (model: string) => `price:${model}`,
  rateLimit: (userId: number, window: string) => `rate:${userId}:${window}`,
} as const;

// TTL in seconds
export const CacheTTL = {
  apiKey: 300,
  group: 60,
  channelHealth: 30,
  roundRobinCounter: 0,
  userQuota: 60,
  modelPrice: 3600,
  rateLimit: 60,
} as const;

function createKvStore(): KVStore {
  const isProduction = process.env.NODE_ENV === "production";
  const cloudflareEnv = getCloudflareEnv({ require: isProduction });

  if (cloudflareEnv) {
    return new CloudflareKVStore({
      accountId: cloudflareEnv.CF_ACCOUNT_ID,
      namespaceId: cloudflareEnv.CF_KV_NAMESPACE_ID,
      apiToken: cloudflareEnv.CF_API_TOKEN,
    });
  }

  return new MemoryKVStore();
}

const store = createKvStore();

class KVCache {
  async get<T>(key: string): Promise<T | null> {
    return store.get<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    return store.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    return store.delete(key);
  }

  async increment(key: string, delta = 1, ttlSeconds?: number): Promise<number> {
    return store.increment(key, delta, ttlSeconds);
  }

  async getOrSet<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    return store.getOrSet(key, fn, ttlSeconds);
  }
}

export const kv = new KVCache();
