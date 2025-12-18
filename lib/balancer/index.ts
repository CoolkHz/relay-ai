import { eq } from "drizzle-orm";
import { db } from "../db";
import { groups, groupChannels, channels } from "../db/schema";
import { kv, CacheKeys, CacheTTL } from "../cache/kv";
import { isChannelHealthy } from "./health";
import { roundRobin } from "./strategies/round-robin";
import { random } from "./strategies/random";
import { weighted } from "./strategies/weighted";
import { failover } from "./strategies/failover";
import type { Channel, Group, GroupChannel } from "../db/schema";
import type { ChannelType } from "../llm/types";

export interface ChannelWithMapping {
  id: number;
  name: string;
  type: ChannelType;
  baseUrl: string;
  apiKey: string;
  modelMapping: string | null;
  weight: number;
  priority: number;
  timeout: number;
  maxRetries: number;
}

export interface GroupConfig {
  id: number;
  name: string;
  balanceStrategy: string;
  channels: ChannelWithMapping[];
}

export interface ChannelSelection {
  channel: ChannelWithMapping;
  actualModel: string;
}

async function getGroupConfig(groupName: string): Promise<GroupConfig | null> {
  // Check cache
  const cached = await kv.get<GroupConfig>(CacheKeys.group(groupName));
  if (cached) return cached;

  // Query database
  const group = await db.query.groups.findFirst({
    where: eq(groups.name, groupName),
    with: {
      groupChannels: {
        with: { channel: true },
      },
    },
  });

  if (!group || group.status !== "active") return null;

  const config: GroupConfig = {
    id: group.id,
    name: group.name,
    balanceStrategy: group.balanceStrategy,
    channels: group.groupChannels
      .filter((gc) => gc.channel.status === "active")
      .map((gc) => ({
        id: gc.channel.id,
        name: gc.channel.name,
        type: gc.channel.type as ChannelType,
        baseUrl: gc.channel.baseUrl,
        apiKey: gc.channel.apiKey,
        modelMapping: gc.modelMapping,
        weight: gc.weight,
        priority: gc.priority,
        timeout: gc.channel.timeout,
        maxRetries: gc.channel.maxRetries,
      })),
  };

  // Cache the config
  await kv.set(CacheKeys.group(groupName), config, CacheTTL.group);
  return config;
}

export async function selectChannel(groupName: string): Promise<ChannelSelection | null> {
  const group = await getGroupConfig(groupName);
  if (!group || group.channels.length === 0) return null;

  // Filter healthy channels
  const healthyChannels: ChannelWithMapping[] = [];
  for (const channel of group.channels) {
    if (await isChannelHealthy(channel.id)) {
      healthyChannels.push(channel);
    }
  }

  if (healthyChannels.length === 0) {
    // Fallback to all channels if none are healthy
    healthyChannels.push(...group.channels);
  }

  let selected: ChannelWithMapping;

  switch (group.balanceStrategy) {
    case "round_robin":
      selected = await roundRobin(group.id, healthyChannels);
      break;
    case "random":
      selected = random(healthyChannels);
      break;
    case "weighted":
      selected = weighted(healthyChannels);
      break;
    case "failover":
      selected = failover(healthyChannels);
      break;
    default:
      selected = healthyChannels[0];
  }

  return {
    channel: selected,
    actualModel: selected.modelMapping ?? groupName,
  };
}

export async function invalidateGroupCache(groupName: string): Promise<void> {
  await kv.delete(CacheKeys.group(groupName));
}
