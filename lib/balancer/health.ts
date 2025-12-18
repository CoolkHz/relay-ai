import { kv, CacheKeys, CacheTTL } from "../cache/kv";

export interface HealthStatus {
  healthy: boolean;
  lastCheck: number;
  consecutiveErrors: number;
  lastError?: string;
}

const ERROR_THRESHOLD = 3;
const RECOVERY_TIME = 60000; // 60 seconds

export async function isChannelHealthy(channelId: number): Promise<boolean> {
  const status = await kv.get<HealthStatus>(CacheKeys.channelHealth(channelId));
  if (!status) return true;

  if (!status.healthy) {
    // Allow retry after recovery time
    if (Date.now() - status.lastCheck > RECOVERY_TIME) {
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

  if (current.consecutiveErrors >= ERROR_THRESHOLD) {
    current.healthy = false;
  }

  await kv.set(CacheKeys.channelHealth(channelId), current, CacheTTL.channelHealth);
}

export async function getChannelHealth(channelId: number): Promise<HealthStatus | null> {
  return kv.get<HealthStatus>(CacheKeys.channelHealth(channelId));
}
