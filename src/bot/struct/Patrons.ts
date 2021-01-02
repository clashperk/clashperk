import { SETTINGS, COLLECTIONS } from '../util/Constants';
import { Message } from 'discord.js';
import Client from './Client';

export interface Patron {
	id: string;
	name: string;
	discord_id?: string;
	discord_username?: string;
	guilds: {
		id: string;
		limit: string;
	}[];
	comment?: string;
	sponsored: boolean;
	active: boolean;
	paused: boolean;
	expired?: boolean;
	createdAt: Date;
	expiredAt?: Date;
	redeemed: boolean;
	entitled_amount: number;
	lifetime_support?: number;
}

export default class Patrons {
	private readonly patrons: Set<string>;

	public constructor(private readonly client: Client) {
		this.patrons = new Set();
	}

	public async init() {
		return this.refresh();
	}

	public get(message: string | Message): boolean {
		if (message instanceof Message) return this.patrons.has(message.author.id) || this.patrons.has(message.guild!.id);
		return this.patrons.has(message);
	}

	public async refresh() {
		this.patrons.clear(); // Clear old userId and guildId

		await this.client.db.collection<Patron>(COLLECTIONS.PATRONS)
			.find({ active: true })
			.forEach(data => {
				if (data.discord_id) this.patrons.add(data.discord_id);

				for (const guild of data.guilds) {
					this.patrons.add(guild.id);
					const limit = this.client.settings.get(guild.id, SETTINGS.LIMIT, 2);
					if (limit !== guild.limit) this.client.settings.set(guild.id, SETTINGS.LIMIT, guild.limit);
				}
			});
	}
}
