import { Clan, Player } from 'clashofclans.js';
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
		const raw = await this.client.redis.connection.json.mGet(
			clanTags.map((tag) => `C${tag}`),
			'$'
		);
		return raw.flat().filter((_) => _) as unknown as Clan[];
	}

	public async getClan(clanTag: string) {
		const raw = await this.client.redis.connection.json.get(`$C${clanTag}`);
		if (!raw) return null;
		return raw as unknown as Clan;
	}

	public async getPlayers(playerTags: string[]) {
		const raw = await this.client.redis.connection.json.mGet(
			playerTags.map((tag) => `P${tag}`),
			'$'
		);
		return raw.flat().filter((_) => _) as unknown as Player[];
	}

	public async getPlayer(playerTag: string) {
		const raw = await this.client.redis.connection.json.get(`$P${playerTag}`);
		if (!raw) return null;
		return raw as unknown as Player;
	}
}

export default RedisService;
