import type { ChannelWithMapping } from "../index";

export function weighted(channels: ChannelWithMapping[]): ChannelWithMapping {
  const totalWeight = channels.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;

  for (const channel of channels) {
    random -= channel.weight;
    if (random <= 0) return channel;
  }

  return channels[0];
}
