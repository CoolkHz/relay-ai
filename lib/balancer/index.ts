import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { groups, groupChannels, channels } from "../db/schema";
import { kv, CacheKeys, CacheTTL } from "../cache/kv";
import { isChannelHealthy } from "./health";
import { roundRobin } from "./strategies/round-robin";
import { random } from "./strategies/random";
import { weighted } from "./strategies/weighted";
import { failover } from "./strategies/failover";
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

  // 分步查询：先查询group
  const group = await db.select().from(groups).where(eq(groups.name, groupName)).execute().then(res => res[0]);
  
  if (!group || group.status !== "active") return null;
  
  // 查询关联的groupChannels
  const groupChannelsList = await db
    .select()
    .from(groupChannels)
    .where(eq(groupChannels.groupId, group.id))
    .execute();
  
  if (groupChannelsList.length === 0) {
    // 没有关联的渠道，返回空配置
    const config: GroupConfig = {
      id: group.id,
      name: group.name,
      balanceStrategy: group.balanceStrategy,
      channels: [],
    };
    await kv.set(CacheKeys.group(groupName), config, CacheTTL.group);
    return config;
  }
  
  // 查询所有相关的channels
  const channelIds = groupChannelsList.map(gc => gc.channelId);
  const channelsList = await db
    .select()
    .from(channels)
    .where(and(eq(channels.status, "active"), inArray(channels.id, channelIds)))
    .execute();
  
  // 构建channel映射
  const channelsMap = new Map(channelsList.map(ch => [ch.id, ch]));
  
  // 构建配置
  const config: GroupConfig = {
    id: group.id,
    name: group.name,
    balanceStrategy: group.balanceStrategy,
    channels: groupChannelsList
      .map(gc => {
        const channel = channelsMap.get(gc.channelId);
        if (!channel) return null;
        return {
          id: channel.id,
          name: channel.name,
          type: channel.type as ChannelType,
          baseUrl: channel.baseUrl,
          apiKey: channel.apiKey,
          modelMapping: gc.modelMapping,
          weight: gc.weight,
          priority: gc.priority,
          timeout: channel.timeout,
          maxRetries: channel.maxRetries,
        };
      })
      .filter((ch): ch is ChannelWithMapping => ch !== null),
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
