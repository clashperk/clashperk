import { Collections, Settings } from '../util/Constants';
import { Collection } from 'mongodb';
import fetch from 'node-fetch';
import Client from './Client';
import qs from 'querystring';

export interface Patron {
	id: string;
	name: string;
	rewardId: string;
	discord_id?: string;
	discord_username?: string;
	guilds: {
		id: string; limit: string;
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
	shared?: string[];
	declined?: boolean;
	cancelled?: boolean;
}

export default class Patrons {
	private readonly collection: Collection<Patron>;
	private readonly patrons = new Set<string>();
	private _declines: Patron[] = [];

	public constructor(private readonly client: Client) {
		this.collection = this.client.db.collection(Collections.PATRONS);
	}

	public async init() {
		await this._fetch();
		await this._check();
		await this.refresh();
		setInterval(this._check.bind(this), 5 * 60 * 1000).unref();
	}

	public get(message: any): boolean {
		if (typeof message === 'string') return this.patrons.has(message);
		return this.patrons.has(message.author.id) || this.patrons.has(message.guild!.id);
	}

	public async refresh() {
		const patrons = await this.collection.find({ active: true }).toArray();
		this.patrons.clear(); // clear old user_id and guild_id
		for (const data of patrons) {
			if (data.discord_id) this.patrons.add(data.discord_id);
			for (const id of data.shared ?? []) this.patrons.add(id);

			for (const guild of data.guilds) {
				this.patrons.add(guild.id);
				const limit = this.client.settings.get(guild.id, Settings.CLAN_LIMIT, 2);
				if (limit !== guild.limit) this.client.settings.set(guild.id, Settings.CLAN_LIMIT, guild.limit);
			}
		}
	}

	public async _fetch() {
		this._declines = await this.collection.find(
			{ active: false, declined: true, cancelled: false }
		).toArray();
	}

	private async _check() {
		if (!this._declines.length) return; // no declined patrons 😎

		const query = qs.stringify({ 'include': 'patron.null', 'page[count]': 200, 'sort': 'created' });
		const data = await fetch(`https://www.patreon.com/api/oauth2/api/campaigns/2589569/pledges?${query}`, {
			headers: { authorization: `Bearer ${process.env.PATREON_API!}` }, timeout: 10000
		}).then(res => res.json()).catch(() => null);
		if (!data?.data) return; // awww shit no data? let's skip it

		for (const patron of this._declines) {
			const pledge = data.data.find((entry: any) => entry?.relationships?.patron?.data?.id === patron.id);
			if (!pledge) {
				const itemIndex = this._declines.findIndex(data => data.id === patron.id);
				if (itemIndex >= 0) this._declines.splice(itemIndex, 1);
				await this.collection.updateOne({ id: patron.id }, { $set: { cancelled: true } });
				this.client.logger.info(
					`Declined Patron Deleted ${patron.discord_username ?? patron.name} (${patron.discord_id ?? patron.id})`,
					{ label: 'PATRON' }
				);
				continue;
			}

			// skip active patrons
			if (pledge.attributes.declined_since) continue;

			await this.collection.updateOne({ id: patron.id }, { $set: { declined: false, active: true } });
			try {
				await this.client.shard!.broadcastEval(client => {
					// @ts-expect-error
					client.patrons.refresh();
				});
			} catch {
				await this.refresh();
			}
			// eslint-disable-next-line
			for (const guild of patron.guilds ?? []) await this._restore(guild.id);
			const itemIndex = this._declines.findIndex(data => data.id === patron.id);
			if (itemIndex >= 0) this._declines.splice(itemIndex, 1);
			this.client.logger.info(
				`Declined Patron Resumed ${patron.discord_username ?? patron.name} (${patron.discord_id ?? patron.id})`,
				{ label: 'PATRON' }
			);
		}
	}

	private async _restore(guildId: string) {
		await this.client.db.collection(Collections.CLAN_STORES)
			.updateMany({ guild: guildId }, { $set: { active: true, patron: true } });

		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: guildId }).toArray();
		for (const data of clans) {
			try {
				await this.client.shard!.broadcastEval((client, data) => {
					if (client.guilds.cache.has(data.guild)) {
						// @ts-expect-error
						client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: data.guild, op: 0 });
					}
				}, { context: data });
			} catch {
				if (this.client.guilds.cache.has(data.guild)) {
					await this.client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: data.guild, op: 0 });
				}
			}
		}
	}
}
