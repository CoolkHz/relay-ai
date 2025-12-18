import { kv, CacheKeys } from "../../cache/kv";
import type { ChannelWithMapping } from "../index";

export async function roundRobin(
  groupId: number,
  channels: ChannelWithMapping[]
): Promise<ChannelWithMapping> {
  const key = CacheKeys.roundRobinCounter(groupId);
  const index = await kv.increment(key);
  return channels[(index - 1) % channels.length];
}
