import type { ChannelWithMapping } from "../index";

export function random(channels: ChannelWithMapping[]): ChannelWithMapping {
  return channels[Math.floor(Math.random() * channels.length)];
}
