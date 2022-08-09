import qs from 'querystring';
import { Collection } from 'mongodb';
import { request as fetch } from 'undici';
import { Interaction } from 'discord.js';
import { Collections, Settings } from '../util/Constants.js';
import { Client } from './Client.js';

export default class Patrons {
	private readonly collection: Collection<Patron>;
	private readonly patrons = new Set<string>();

	public constructor(private readonly client: Client) {
		this.collection = this.client.db.collection(Collections.PATRONS);

		this.collection
			.watch(
				[
					{
						$match: {
							operationType: { $in: ['insert', 'update', 'delete'] }
						}
					}
				],
				{ maxTimeMS: 500, maxAwaitTimeMS: 500 }
			)
			.on('change', async (change) => {
				if (['update', 'insert'].includes(change.operationType)) {
					await this.refresh();
				}
			});
	}

	public async init() {
		await this.refresh();
		await this._autoDelete(true);
		setInterval(() => this._autoDelete(false), 30 * 60 * 1000).unref();
	}

	public get(interaction: Interaction | string): boolean {
		if (typeof interaction === 'string') return this.patrons.has(interaction);
		return this.patrons.has(interaction.guild!.id);
	}

	public async refresh() {
		const patrons = await this.collection.find({ active: true }).toArray();
		this.patrons.clear(); // clear old user_id and guild_id
		for (const data of patrons) {
			if (data.userId) this.patrons.add(data.userId);

			for (const guild of data.guilds) {
				this.patrons.add(guild.id);
				if (this.client.settings.get(guild.id, Settings.CLAN_LIMIT, 2) !== guild.limit) {
					await this.client.settings.set(guild.id, Settings.CLAN_LIMIT, guild.limit);
				}
			}
		}
	}

	private async _autoDelete(debug = false) {
		const res = await this.fetchAPI();
		if (!res) return null;
		if (debug) this.client.logger.info(`Patron Handler Initialized.`, { label: 'PATREON' });

		const patrons = await this.collection.find().toArray();
		for (const patron of patrons) {
			const pledge = res.data.find((entry) => entry.relationships.user.data.id === patron.id);

			const rewardId = pledge?.relationships.currently_entitled_tiers.data[0]?.id;
			if (rewardId && patron.rewardId !== rewardId) {
				await this.collection.updateOne({ _id: patron._id }, { $set: { rewardId } });
			}

			if (pledge && new Date(pledge.attributes.last_charge_date).getTime() >= patron.lastChargeDate.getTime()) {
				await this.collection.updateOne(
					{ _id: patron._id },
					{
						$set: {
							lastChargeDate: new Date(pledge.attributes.last_charge_date)
						}
					}
				);
			}

			if (
				pledge &&
				!(
					pledge.attributes.lifetime_support_cents === patron.lifetimeSupport &&
					pledge.attributes.currently_entitled_amount_cents === patron.entitledAmount
				)
			) {
				await this.collection.updateOne(
					{ _id: patron._id },
					{
						$set: {
							entitledAmount: pledge.attributes.currently_entitled_amount_cents,
							lifetimeSupport: pledge.attributes.lifetime_support_cents
						}
					}
				);
			}

			if (patron.active && pledge?.attributes.patron_status === 'former_patron') {
				await this.collection.updateOne({ id: patron.id }, { $set: { cancelled: true, active: false } });
				this.client.logger.info(`Declined Patron Deleted ${patron.username} (${patron.userId}/${patron.id})`, { label: 'PATRON' });

				// eslint-disable-next-line
				for (const guild of patron.guilds ?? []) await this.deleteGuild(guild.id);
			}

			if (!patron.active && (patron.declined || patron.cancelled) && pledge?.attributes.patron_status === 'active_patron') {
				await this.collection.updateOne({ id: patron.id }, { $set: { declined: false, active: true, cancelled: false } });
				// eslint-disable-next-line
				for (const guild of patron.guilds ?? []) await this.restoreGuild(guild.id);
				this.client.logger.info(`Declined Patron Resumed ${patron.username} (${patron.userId}/${patron.id})`, { label: 'PATRON' });
			}

			if (patron.active && pledge?.attributes.patron_status === 'declined_patron' && new Date().getUTCDay() >= 5) {
				await this.collection.updateOne({ id: patron.id }, { $set: { declined: true, active: false } });
				// eslint-disable-next-line
				for (const guild of patron.guilds ?? []) await this.deleteGuild(guild.id);
			}
		}
	}

	private async restoreGuild(guildId: string) {
		await this.client.db.collection(Collections.CLAN_STORES).updateMany({ guild: guildId }, { $set: { active: true, patron: true } });

		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: guildId }).toArray();
		for (const data of clans) {
			try {
				await this.client.shard!.broadcastEval(
					(client, data) => {
						if (client.guilds.cache.has(data.guild)) {
							// @ts-expect-error
							client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: data.guild, op: 0 });
						}
					},
					{ context: data }
				);
			} catch {
				if (this.client.guilds.cache.has(data.guild)) {
					await this.client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: data.guild, op: 0 });
				}
			}
		}
	}

	private async deleteGuild(guildId: string) {
		await this.client.settings.delete(guildId, Settings.CLAN_LIMIT);
		await this.client.db.collection(Collections.CLAN_STORES).updateMany({ guild: guildId }, { $set: { patron: false } });

		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: guildId }).skip(2).toArray();
		for (const data of clans) {
			await this.client.db.collection(Collections.CLAN_STORES).updateOne({ _id: data._id }, { $set: { active: false } });
			await this.client.rpcHandler.delete(data._id.toString(), { tag: data.tag, op: 0, guild: guildId });
		}
	}

	public async fetchAPI() {
		const query = qs.stringify({
			'page[size]': 500,
			'fields[tier]': 'amount_cents,created_at',
			'include': 'user,currently_entitled_tiers',
			'fields[user]': 'social_connections,email,full_name,email,image_url',
			'fields[member]':
				'last_charge_status,last_charge_date,patron_status,email,pledge_relationship_start,currently_entitled_amount_cents,lifetime_support_cents'
		});

		const data = (await fetch(`https://www.patreon.com/api/oauth2/v2/campaigns/2589569/members?${query}`, {
			headers: { authorization: `Bearer ${process.env.PATREON_API!}` },
			bodyTimeout: 10000
		})
			.then((res) => res.body.json())
			.catch(() => null)) as { data: Member[]; included: Included[] } | null;

		return data?.data ? data : null;
	}
}

export interface Patron {
	id: string;
	name: string;
	rewardId: string;

	userId: string;
	username: string;

	guilds: {
		id: string;
		name: string;
		limit: number;
	}[];
	redeemed: boolean;

	active: boolean;
	declined: boolean;
	cancelled: boolean;

	entitledAmount: number;
	lifetimeSupport: number;

	createdAt: Date;
	lastChargeDate: Date;
}

export interface Member {
	attributes: {
		email: string;
		last_charge_date: string;
		currently_entitled_amount_cents: number;
		lifetime_support_cents: number;
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
