import { APIClan, APIPlayer } from 'clashofclans.js';
import { nanoid } from 'nanoid';
import * as Redis from 'redis';
import Client from './Client.js';
import { CustomIdProps } from './ComponentHandler.js';

export declare type RedisJSON = null | boolean | number | string | Date;

class RedisService {
  public connection = Redis.createClient({
    url: process.env.REDIS_URL,
    database: 1
  });

  public disconnect() {
    return this.connection.disconnect();
  }

  public constructor(private readonly client: Client) {
    this.connection.on('error', (error) => this.client.logger.error(error, { label: 'REDIS' }));
  }

  public async getClans(clanTags: string[]) {
    const raw = await this.connection.json.mGet(
      clanTags.map((tag) => `CLAN:${tag}`),
      '$'
    );
    return raw.flat().filter((_) => _) as unknown as APIClan[];
  }

  public async getClan(clanTag: string) {
    const raw = await this.connection.json.get(`CLAN:${clanTag}`);
    return raw as unknown as APIClan | null;
  }

  public async getPlayers(playerTags: string[]) {
    const raw = await this.connection.json.mGet(
      playerTags.map((tag) => `PLAYER:${tag}`),
      '$'
    );
    return raw.flat().filter((_) => _) as unknown as APIPlayer[];
  }

  public async getPlayer(playerTag: string) {
    const raw = await this.connection.json.get(`PLAYER:${playerTag}`);
    return raw as unknown as APIPlayer | null;
  }

  public createCustomId(payload: CustomIdProps) {
    const softId = JSON.stringify(payload);
    if (softId.length <= 100) return softId;

    const customId = `CMD:${nanoid()}`;

    const query = this.connection.multi();
    query.json.set(customId, '$', payload as unknown as RedisJSON);
    query.expire(customId, 60 * 60 * 24 * 100); // 100 DAYS
    query.exec();

    return customId;
  }

  public async getCustomId<T>(customId: string) {
    const record = await this.connection.json.get(customId);
    return record as unknown as T;
  }

  public async deleteCustomId(customId: string) {
    return this.connection.del(customId);
  }

  public async expireCustomId(customId: string) {
    return this.connection.expire(customId, 60, 'XX');
  }
}

export default RedisService;
