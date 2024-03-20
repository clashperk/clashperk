import { APIClan, APIPlayer } from 'clashofclans.js';
import { nanoid } from 'nanoid';
import * as Redis from 'redis';
import Client from './Client.js';

export declare type RedisJSON = null | boolean | number | string | Date;

class RedisService {
	public connection = Redis.createClient({
		url: process.env.REDIS_URL,
		database: 1
	});

	public constructor(private readonly client: Client) {
		this.connection.on('error', (error) => this.client.logger.error(error, { label: 'REDIS' }));
	}

	public async getClans(clanTags: string[]) {
		const raw = await this.connection.json.mGet(clanTags.map((tag) => [`C${tag}`, `CLAN:${tag}`]).flat(), '$');
		return raw.flat().filter((_) => _) as unknown as APIClan[];
	}

	public async getClan(clanTag: string) {
		const raw = await this.connection.json.mGet([`C${clanTag}`, `CLAN:${clanTag}`], '$');
		return raw.flat().filter((_) => _)[0] as unknown as APIClan;
	}

	public async getPlayers(playerTags: string[]) {
		const raw = await this.connection.json.mGet(playerTags.map((tag) => [`P${tag}`, `PLAYER:${tag}`]).flat(), '$');
		return raw.flat().filter((_) => _) as unknown as APIPlayer[];
	}

	public async getPlayer(playerTag: string) {
		const raw = await this.connection.json.mGet([`P${playerTag}`, `PLAYER:${playerTag}`], '$');
		return raw.flat().filter((_) => _)[0] as unknown as APIPlayer;
	}

	public createCustomId(payload: Record<string, unknown>) {
		const { uuid, ...rest } = payload;

		const softId = JSON.stringify(rest);
		if (softId.length <= 100) return softId;

		const customId = `CMD:${nanoid()}`;
		const query = this.connection.multi();
		query.json.set(customId, '$', { ...payload, uuid } as unknown as RedisJSON);
		query.expire(customId, 60 * 60 * 24 * 100);

		if (uuid) {
			query.sAdd(`SID:${uuid as string}`, customId);
			query.expire(`SID:${uuid as string}`, 60 * 60 * 24 * 100);
		}

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
		const record = await this.getCustomId<{ uuid?: string } | null>(customId);
		if (!record) return null;

		const query = this.connection.multi();
		if (record.uuid) {
			const customIds = await this.connection.sMembers(`SID:${record.uuid}`);
			if (customIds.length) for (const id of customIds) query.expire(id, 60);
			query.expire(`SID:${record.uuid}`, 60);
		}

		query.expire(customId, 60);
		return query.exec();
	}
}

export default RedisService;
