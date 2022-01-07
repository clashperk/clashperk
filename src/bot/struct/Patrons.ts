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
	shared?: string[];
	declined?: boolean;
	cancelled?: boolean;
}

export interface Member {
	attributes: {
		email: string;
		last_charge_date: string;
		currently_entitled_amount_cents: number;
		pledge_relationship_start: string;
		patron_status: 'active_patron' | 'declined_patron' | 'former_patron' | null;
		last_charge_status: 'Paid' | 'Declined' | 'Deleted' | 'Pending' | 'Refunded' | 'Fraud' | 'Other' | null;
	};
	id: string;
	relationships: {
		currently_entitled_tiers: {
			data: {
				id: string;
				type: string;
			}[];
		};
		user: {
			data: {
				id: string;
				type: string;
			};
		};
	};
	type: string;
}

export interface Included {
	attributes: {
		full_name: string;
		image_url: string;
		social_connections?: {
			discord?: {
				user_id?: string;
			};
		};
	};
	id: string;
	type: string;
}

export default class Patrons {
	private readonly collection: Collection<Patron>;
	private readonly patrons = new Set<string>();

	public constructor(private readonly client: Client) {
		this.collection = this.client.db.collection(Collections.PATRONS);

		this.collection.watch().on('change', async change => {
			if (['update', 'insert'].includes(change.operationType)) {
				await this.refresh();
			}
		});
	}

	public async init() {
		await this.refresh();
		await this._autoDelete(true);
		setInterval(this._autoDelete.bind(this), 30 * 60 * 1000, false).unref();
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
				if (this.client.settings.get(guild.id, Settings.CLAN_LIMIT, 2) !== guild.limit) {
					await this.client.settings.set(guild.id, Settings.CLAN_LIMIT, guild.limit);
				}
			}
		}
	}

	private async _autoDelete(debug = false) {
		const res = await this._fetchAPI();
		if (!res) return null;
		if (debug) this.client.logger.info(`Patron Handler Initialized.`, { label: 'PATREON' });

		const patrons = await this.collection.find().toArray();
		for (const patron of patrons) {
			const pledge = res.data.find(entry => entry.relationships.user.data.id === patron.id);

			if (patron.active && pledge?.attributes.patron_status === 'former_patron') {
				await this.collection.updateOne({ id: patron.id }, { $set: { cancelled: true, active: false } });
				this.client.logger.info(
					`Declined Patron Deleted ${patron.discord_username ?? patron.name} (${patron.discord_id ?? patron.id})`,
					{ label: 'PATRON' }
				);

				// eslint-disable-next-line
				for (const guild of patron.guilds ?? []) await this._delete(guild.id);
			}

			if (!patron.active && (patron.declined || patron.cancelled) && pledge?.attributes.patron_status === 'active_patron') {
				await this.collection.updateOne({ id: patron.id }, { $set: { declined: false, active: true, cancelled: false } });
				// eslint-disable-next-line
				for (const guild of patron.guilds ?? []) await this._restore(guild.id);
				this.client.logger.info(
					`Declined Patron Resumed ${patron.discord_username ?? patron.name} (${patron.discord_id ?? patron.id})`,
					{ label: 'PATRON' }
				);
			}

			if (patron.active && pledge?.attributes.patron_status === 'declined_patron' && new Date().getUTCDay() >= 5) {
				await this.collection.updateOne({ id: patron.id }, { $set: { declined: true, active: false } });
				// eslint-disable-next-line
				for (const guild of patron.guilds ?? []) await this._delete(guild.id);
			}
		}
	}

	private async _restore(guildId: string) {
		await this.client.db.collection(Collections.CLAN_STORES)
			.updateMany({ guild: guildId }, { $set: { active: true, patron: true } });

		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: guildId })
			.toArray();
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

	private async _delete(guildId: string) {
		await this.client.settings.delete(guildId, Settings.CLAN_LIMIT);
		await this.client.db.collection(Collections.CLAN_STORES).updateMany({ guild: guildId }, { $set: { patron: false } });

		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: guildId })
			.skip(2)
			.toArray();
		for (const data of clans) {
			await this.client.db.collection(Collections.CLAN_STORES).updateOne({ _id: data._id }, { $set: { active: false } });
			await this.client.rpcHandler.delete(data._id.toString(), { tag: data.tag, op: 0, guild: guildId });
		}
	}

	private async _fetchAPI() {
		const query = qs.stringify({
			'include': 'user,currently_entitled_tiers',
			'page[size]': 500,
			'fields[user]': 'social_connections,email,full_name,email,image_url',
			'fields[tier]': 'amount_cents,created_at',
			'fields[member]': 'last_charge_status,last_charge_date,patron_status,email,pledge_relationship_start,currently_entitled_amount_cents'
		});

		const data = await fetch(`https://www.patreon.com/api/oauth2/v2/campaigns/2589569/members?${query}`, {
			headers: { authorization: `Bearer ${process.env.PATREON_API_V2!}` }, timeout: 10000
		}).then(res => res.json()).catch(() => null) as { data: Member[]; included: Included[] } | null;

		return data?.data ? data : null;
	}
}
