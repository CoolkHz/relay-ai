import type { KVStore } from "../store";

export type CloudflareKVEnv = {
  accountId: string;
  namespaceId: string;
  apiToken: string;
};

export class CloudflareKVStore implements KVStore {
  private baseUrl: string;
  private apiToken: string;

  constructor(env: CloudflareKVEnv) {
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${env.accountId}/storage/kv/namespaces/${env.namespaceId}`;
    this.apiToken = env.apiToken;
  }

  private async request(path: string, options: RequestInit = {}) {
    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
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

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      if (ttlSeconds && ttlSeconds > 0) params.set("expiration_ttl", ttlSeconds.toString());

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

  /**
   * Increment a numeric value in KV.
   * NOTE: This is NOT atomic due to Cloudflare KV API limitations.
   * For high-concurrency scenarios like round-robin/rate-limit, consider using
   * a storage with atomic counters (e.g. Durable Objects) in production.
   */
  async increment(key: string, delta = 1, ttlSeconds?: number): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next =
      typeof current === "number" && Number.isFinite(current) ? current + delta : delta;
    await this.set(key, next, ttlSeconds);
    return next;
  }

  async getOrSet<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

