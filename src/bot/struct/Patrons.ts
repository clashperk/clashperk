import { Message } from 'discord.js';
import Client from './Client';
import { SETTINGS } from '../util/Constants';

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
	public store = new Map<string, any>();

	private readonly users: Map<string, boolean>;

	private readonly patrons: Set<string>;

	public constructor(private readonly client: Client) {
		this.store = new Map();

		this.users = new Map();

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
		this.store.clear();

		return this.client.db.collection<Patron>('patrons')
			.find({ active: true })
			.forEach(data => {
				if (data.discord_id) this.patrons.add(data.discord_id);

				for (const guild of data.guilds) {
					this.patrons.add(guild.id);
					const limit = this.client.settings.get(guild.id, SETTINGS.LIMIT, guild.limit);
					if (limit !== guild.limit) this.client.settings.set(guild.id, SETTINGS.LIMIT, guild.limit);
				}
			});
	}
}
