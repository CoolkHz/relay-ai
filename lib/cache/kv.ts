const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const CF_KV_NAMESPACE_ID = process.env.CF_KV_NAMESPACE_ID!;
const CF_API_TOKEN = process.env.CF_API_TOKEN!;

const KV_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}`;

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

class KVCache {
  private async request(path: string, options: RequestInit = {}) {
    return fetch(`${KV_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const res = await this.request(`/values/${encodeURIComponent(key)}`);
      if (!res.ok) return null;
      const text = await res.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as T;
      }
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      if (ttl && ttl > 0) params.set("expiration_ttl", ttl.toString());

      const res = await this.request(
        `/values/${encodeURIComponent(key)}${params.toString() ? `?${params}` : ""}`,
        {
          method: "PUT",
          body: typeof value === "string" ? value : JSON.stringify(value),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const res = await this.request(`/values/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async increment(key: string, delta = 1): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const newValue = current + delta;
    await this.set(key, newValue);
    return newValue;
  }

  async getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }
}

export const kv = new KVCache();
