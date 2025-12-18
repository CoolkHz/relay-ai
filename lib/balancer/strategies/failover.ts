import type { ChannelWithMapping } from "../index";

export function failover(channels: ChannelWithMapping[]): ChannelWithMapping {
  // Sort by priority descending, return highest priority
  return [...channels].sort((a, b) => b.priority - a.priority)[0];
}
