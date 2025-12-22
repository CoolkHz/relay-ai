import { kv, CacheKeys, CacheTTL } from "../cache/kv";
import { createAsyncTtlMemo } from "../cache/memoize";

export interface HealthStatus {
  healthy: boolean;
  lastCheck: number;
  consecutiveErrors: number;
  lastError?: string;
}

// Health check configuration
export const HEALTH_CONFIG = {
  /** Number of consecutive errors before marking channel unhealthy */
  ERROR_THRESHOLD: 3,
  /** Time in ms before allowing retry on unhealthy channel */
  RECOVERY_TIME: 60000,
} as const;

const healthMemo = createAsyncTtlMemo<HealthStatus | null>(1000);

export async function isChannelHealthy(channelId: number): Promise<boolean> {
  const status = await getChannelHealth(channelId);
  if (!status) return true;

  if (!status.healthy) {
    // Allow retry after recovery time
    if (Date.now() - status.lastCheck > HEALTH_CONFIG.RECOVERY_TIME) {
      return true;
    }
    return false;
  }
  return true;
}

export async function recordChannelSuccess(channelId: number): Promise<void> {
  const status: HealthStatus = {
    healthy: true,
    lastCheck: Date.now(),
    consecutiveErrors: 0,
  };
  await kv.set(CacheKeys.channelHealth(channelId), status, CacheTTL.channelHealth);
  healthMemo.delete(String(channelId));
}

export async function recordChannelError(channelId: number, error?: string): Promise<void> {
  const current = await kv.get<HealthStatus>(CacheKeys.channelHealth(channelId)) ?? {
    healthy: true,
    lastCheck: Date.now(),
    consecutiveErrors: 0,
  };

  current.consecutiveErrors++;
  current.lastError = error;
  current.lastCheck = Date.now();

  if (current.consecutiveErrors >= HEALTH_CONFIG.ERROR_THRESHOLD) {
    current.healthy = false;
  }

  await kv.set(CacheKeys.channelHealth(channelId), current, CacheTTL.channelHealth);
  healthMemo.delete(String(channelId));
}

export async function getChannelHealth(channelId: number): Promise<HealthStatus | null> {
  return healthMemo.get(String(channelId), () => kv.get<HealthStatus>(CacheKeys.channelHealth(channelId)));
}
