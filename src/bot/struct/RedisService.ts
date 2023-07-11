import { Clan, Player } from 'clashofclans.js';
import * as Redis from 'redis';
import { nanoid } from 'nanoid';
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
		const raw = await this.connection.json.mGet(
			clanTags.map((tag) => `C${tag}`),
			'$'
		);
		return raw.flat().filter((_) => _) as unknown as Clan[];
	}

	public async getClan(clanTag: string) {
		const raw = await this.connection.json.get(`$C${clanTag}`);
		if (!raw) return null;
		return raw as unknown as Clan;
	}

	public async getPlayers(playerTags: string[]) {
		const raw = await this.connection.json.mGet(
			playerTags.map((tag) => `P${tag}`),
			'$'
		);
		return raw.flat().filter((_) => _) as unknown as Player[];
	}

	public async getPlayer(playerTag: string) {
		const raw = await this.connection.json.get(`$P${playerTag}`);
		if (!raw) return null;
		return raw as unknown as Player;
	}

	public createCustomId(payload: Record<string, unknown>) {
		const { uuid, ...rest } = payload;

		const softId = JSON.stringify(rest);
		if (softId.length <= 100) return softId;

		const customId = `CMD-${nanoid()}`;
		const query = this.connection.multi();
		query.json.set(customId, '$', { ...payload, uuid } as unknown as RedisJSON);
		query.expire(customId, 60 * 60 * 24 * 100);

		if (uuid) {
			query.sAdd(`SID-${uuid as string}`, customId);
			query.expire(`SID-${uuid as string}`, 60 * 60 * 24 * 100);
		}

		query.exec();
		return customId;
	}

	public async getCustomId<T>(customId: string) {
		const data = await this.connection.json.get(customId);
		return data as unknown as T;
	}

	public async deleteCustomId(customId: string) {
		return this.connection.del(customId);
	}

	public async expireCustomId(customId: string) {
		const data = await this.getCustomId<{ uuid?: string } | null>(customId);
		if (!data) return null;

		const query = this.connection.multi();
		if (data.uuid) {
			const customIds = await this.connection.sMembers(`SID-${data.uuid}`);
			if (customIds.length) query.del(customIds);
			query.del(`SID-${data.uuid}`);
		}

		query.del(customId);
		return query.exec();
	}
}

export default RedisService;
