import { APIClan, APIPlayer } from 'clashofclans.js';
import { nanoid } from 'nanoid';
import { createClient } from 'redis';
import { mapToPlayerInterface } from '../helper/cache-mapper.helper.js';
import { Client } from './client.js';
import { CustomIdProps } from './component-handler.js';

export declare type RedisJSON = null | boolean | number | string | Date;

export class RedisService {
  public connection = createClient({
    url: process.env.REDIS_URL,
    database: 1,
    disableOfflineQueue: false
  });

  public constructor(private readonly client: Client) {
    this.connection.on('error', (error) => this.client.logger.error(error, { label: 'REDIS' }));
  }

  public disconnect() {
    return this.connection.disconnect();
  }

  public set(key: string, value: string, EX: number) {
    return this.connection.set(key, value, { EX });
  }

  public async getLegendThreshold(key: string) {
    try {
      const raw = await this.connection.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as { timestamp: string; thresholds: { rank: number; minTrophies: number }[] };
    } catch {
      return null;
    }
  }

  public async mGet(keys: string[]) {
    try {
      if (!keys.length) return [];
      return await this.connection.mGet(keys);
    } catch {
      return [];
    }
  }

  public async getClans(clanTags: string[]) {
    const raw = await this.mGet(clanTags.map((tag) => `CLAN:${tag}`));
    return raw
      .flat()
      .filter((value) => value)
      .map((value) => JSON.parse(value!)) as unknown as APIClan[];
  }

  public async getClan(clanTag: string) {
    const raw = await this.connection.get(`CLAN:${clanTag}`).catch(() => null);
    if (!raw) return null;

    return JSON.parse(raw) as unknown as APIClan;
  }

  public async getPlayers(playerTags: string[]) {
    const raw = await this.mGet(playerTags.map((tag) => `PLAYER:${tag}`));
    return raw
      .flat()
      .map((value) => (value ? this.mapToStructure(value) : null))
      .filter((value): value is APIPlayer => Boolean(value));
  }

  public async getPlayer(playerTag: string) {
    const raw = await this.connection.get(`PLAYER:${playerTag}`).catch(() => null);
    if (!raw) return null;

    return this.mapToStructure(raw);
  }

  private mapToStructure(raw: string) {
    try {
      const record = JSON.parse(raw);
      return mapToPlayerInterface(record);
    } catch {
      return null;
    }
  }

  public async getRaidMembers(playerTags: string[]) {
    const raw = await this.mGet(playerTags.map((tag) => `RAID_MEMBER:${tag}`));
    return raw
      .flat()
      .filter((value): value is string => !!value)
      .map((value) => JSON.parse(value)) as unknown as { tag: string; weekId: string; clan: { tag: string } }[];
  }

  public createCustomId(payload: CustomIdProps) {
    const softId = JSON.stringify(payload);
    if (softId.length <= 100) return softId;

    const customId = `CMD:${nanoid()}`;
    this.connection.set(customId, JSON.stringify(payload), { EX: 60 * 60 * 24 * 100 });

    return customId;
  }

  private async fromJSON<T>(id: string) {
    try {
      const data = await this.client.redis.connection.json.get(id);
      return data as unknown as T;
    } catch {
      return null;
    }
  }

  public async getCustomId<T>(id: string) {
    try {
      const data = await this.client.redis.connection.get(id);
      if (!data) return await this.fromJSON<T>(id);

      return JSON.parse(data) as unknown as T;
    } catch {
      return this.fromJSON<T>(id);
    }
  }

  public async deleteCustomId(customId: string) {
    return this.connection.del(customId);
  }

  public async expireCustomId(customId: string) {
    return this.connection.expire(customId, 60, 'XX');
  }
}
