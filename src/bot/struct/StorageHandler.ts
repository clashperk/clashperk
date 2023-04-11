import { createHash } from 'node:crypto';
import { ClanWarLeagueGroup } from 'clashofclans.js';
import { CommandInteraction, ForumChannel, NewsChannel, TextChannel } from 'discord.js';
import { Collection, ObjectId, WithId } from 'mongodb';
import { Collections, Flags, Settings } from '../util/Constants.js';
import { Reminder, Schedule } from './ClanWarScheduler.js';
import { Client } from './Client.js';

export interface ClanStore {
	_id: ObjectId;
	flag: number;
	name: string;
	tag: string;
	alias?: string;
	guild: string;
	patron: boolean;
	paused: boolean;
	active: boolean;
	createdAt: Date;
	verified: boolean;
	lastRan?: Date;
	channels?: string[];
	secureRole: boolean;
	uniqueId: number;
	roleIds?: string[];
	roles?: { coLeader?: string; admin?: string; member?: string }[];
}

export default class StorageHandler {
	public collection: Collection<ClanStore>;

	public constructor(private readonly client: Client) {
		this.collection = client.db.collection(Collections.CLAN_STORES);
	}

	public async find(id: string) {
		return this.collection.find({ guild: id }, { sort: { name: 1 } }).toArray();
	}

	public async _find(id: string, collection: Collections) {
		const result = await this.client.db.collection(collection).find({ guild: id }).toArray();
		return result;
	}

	public async search(guildId: string, query: string[]): Promise<WithId<ClanStore>[]> {
		if (!query.length) return [];
		return this.collection
			.find(
				{
					$or: [
						{
							tag: { $in: query.map((tag) => this.fixTag(tag)) }
						},
						{
							alias: { $in: query.map((alias) => alias) }
						}
					],
					guild: guildId
				},
				{ collation: { locale: 'en', strength: 2 }, sort: { name: 1 } }
			)
			.toArray();
	}

	private fixTag(tag: string) {
		return `#${tag.toUpperCase().replace(/^#/g, '').replace(/O/g, '0')}`;
	}

	public async register(message: CommandInteraction, data: any) {
		const [_clan, _lastClan] = await Promise.all([
			this.collection.findOne({ tag: data.tag }),
			this.collection.find().sort({ uniqueId: -1 }).limit(1).next()
		]);

		const collection = await this.collection.findOneAndUpdate(
			{ tag: data.tag, guild: data.guild },
			{
				$set: {
					name: data.name,
					tag: data.tag,
					guild: message.guild!.id,
					paused: false,
					active: true,
					verified: true,
					patron: this.client.patrons.get(message.guild!.id)
				},
				$setOnInsert: {
					createdAt: new Date(),
					uniqueId: _clan?.uniqueId ?? (_lastClan?.uniqueId ?? 1000) + 1
				},
				$bit: {
					flag: { or: Number(data.op) }
				}
			},
			{ upsert: true, returnDocument: 'after' }
		);

		const id = collection.value!._id.toHexString();
		switch (data.op) {
			case Flags.DONATION_LOG:
				await this.client.db.collection(Collections.DONATION_LOGS).updateOne(
					{ tag: data.tag, guild: data.guild },
					{
						$set: {
							clanId: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							webhook: {
								id: data.webhook.id,
								token: data.webhook.token
							},
							interval: data.interval
						},
						$setOnInsert: {
							monthlyLastPosted: new Date(),
							weeklyLastPosted: new Date(),
							dailyLastPosted: new Date(),
							createdAt: new Date()
						}
					},
					{ upsert: true }
				);
				break;
			case Flags.CLAN_FEED_LOG:
				await this.client.db.collection(Collections.CLAN_FEED_LOGS).updateOne(
					{ tag: data.tag, guild: data.guild },
					{
						$set: {
							clanId: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							role: data.role,
							webhook: {
								id: data.webhook.id,
								token: data.webhook.token
							},
							deepLink: data.deepLink,
							logTypes: data.logTypes
						},
						$setOnInsert: {
							createdAt: new Date()
						}
					},
					{ upsert: true }
				);
				break;
			case Flags.JOIN_LEAVE_LOG:
				await this.client.db.collection(Collections.JOIN_LEAVE_LOGS).updateOne(
					{ tag: data.tag, guild: data.guild },
					{
						$set: {
							clanId: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							role: data.role,
							webhook: {
								id: data.webhook.id,
								token: data.webhook.token
							},
							deepLink: data.deepLink,
							logTypes: data.logTypes
						},
						$setOnInsert: {
							createdAt: new Date()
						}
					},
					{ upsert: true }
				);
				break;
			case Flags.LAST_SEEN_LOG:
				await this.client.db.collection(Collections.LAST_SEEN_LOGS).updateOne(
					{ tag: data.tag, guild: data.guild },
					{
						$set: {
							clanId: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							webhook: {
								id: data.webhook.id,
								token: data.webhook.token
							}
						},
						$setOnInsert: {
							updatedAt: new Date(Date.now() - 30 * 60 * 1000),
							createdAt: new Date()
						}
					},
					{ upsert: true }
				);
				break;
			case Flags.LEGEND_LOG:
				await this.client.db.collection(Collections.LEGEND_LOGS).updateOne(
					{ tag: data.tag, guild: data.guild },
					{
						$set: {
							clanId: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							webhook: {
								id: data.webhook.id,
								token: data.webhook.token
							}
						},
						$setOnInsert: {
							lastPosted: new Date(),
							createdAt: new Date()
						}
					},
					{ upsert: true }
				);
				break;
			case Flags.CAPITAL_LOG:
				await this.client.db.collection(Collections.CAPITAL_LOGS).updateOne(
					{ tag: data.tag, guild: data.guild },
					{
						$set: {
							clanId: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							webhook: {
								id: data.webhook.id,
								token: data.webhook.token
							}
						},
						$setOnInsert: {
							lastPosted: new Date(),
							createdAt: new Date()
						}
					},
					{ upsert: true }
				);
				break;
			case Flags.CLAN_GAMES_LOG:
				await this.client.db.collection(Collections.CLAN_GAMES_LOGS).updateOne(
					{ tag: data.tag, guild: data.guild },
					{
						$set: {
							clanId: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							webhook: {
								id: data.webhook.id,
								token: data.webhook.token
							}
						},
						$setOnInsert: {
							createdAt: new Date()
						}
					},
					{ upsert: true }
				);
				break;
			case Flags.CLAN_EMBED_LOG:
				await this.client.db.collection(Collections.CLAN_EMBED_LOGS).updateOne(
					{ tag: data.tag, guild: data.guild },
					{
						$set: {
							clanId: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							embed: data.embed,
							webhook: {
								id: data.webhook.id,
								token: data.webhook.token
							}
						},
						$setOnInsert: {
							createdAt: new Date()
						}
					},
					{ upsert: true }
				);
				break;
			case Flags.CLAN_WAR_LOG:
				await this.client.db.collection(Collections.CLAN_WAR_LOGS).updateOne(
					{ tag: data.tag, guild: data.guild },
					{
						$set: {
							clanId: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							webhook: {
								id: data.webhook.id,
								token: data.webhook.token
							},
							logTypes: data.logTypes
						},
						$setOnInsert: {
							createdAt: new Date()
						}
					},
					{ upsert: true }
				);
				break;
			default:
				break;
		}

		return id;
	}

	public async delete(id: string) {
		await Promise.all([
			this.client.db.collection(Collections.DONATION_LOGS).deleteOne({ clanId: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_FEED_LOGS).deleteOne({ clanId: new ObjectId(id) }),
			this.client.db.collection(Collections.JOIN_LEAVE_LOGS).deleteOne({ clanId: new ObjectId(id) }),
			this.client.db.collection(Collections.LAST_SEEN_LOGS).deleteOne({ clanId: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_GAMES_LOGS).deleteOne({ clanId: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_EMBED_LOGS).deleteOne({ clanId: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_WAR_LOGS).deleteOne({ clanId: new ObjectId(id) }),
			this.client.db.collection(Collections.LEGEND_LOGS).deleteOne({ clanId: new ObjectId(id) }),
			this.client.db.collection(Collections.CAPITAL_LOGS).deleteOne({ clanId: new ObjectId(id) }),
			this.client.db.collection(Collections.CLAN_STORES).deleteOne({ _id: new ObjectId(id) })
		]);
	}

	public async deleteReminders(clanTag: string, guild: string) {
		await Promise.allSettled([
			this.deleteWarReminders(clanTag, guild),
			this.deleteCapitalReminders(clanTag, guild),
			this.deleteClanGamesReminders(clanTag, guild)
		]);
	}

	public async deleteWarReminders(clanTag: string, guild: string) {
		const rem = await this.client.db.collection<Reminder>(Collections.REMINDERS).findOne({ guild, clans: clanTag });
		if (!rem) return null;
		await this.client.db.collection<Schedule>(Collections.SCHEDULERS).deleteMany({ reminderId: rem._id });
		if (rem.clans.length === 1) {
			return this.client.db.collection(Collections.REMINDERS).deleteOne({ _id: rem._id });
		}
		return this.client.db.collection(Collections.REMINDERS).updateOne({ _id: rem._id }, { $pull: { clans: clanTag } });
	}

	public async deleteCapitalReminders(clanTag: string, guild: string) {
		const rem = await this.client.db.collection(Collections.RAID_REMINDERS).findOne({ guild, clans: clanTag });
		if (!rem) return null;
		await this.client.db.collection(Collections.RAID_SCHEDULERS).deleteMany({ reminderId: rem._id });
		if (rem.clans.length === 1) {
			return this.client.db.collection(Collections.RAID_REMINDERS).deleteOne({ _id: rem._id });
		}
		return this.client.db.collection(Collections.RAID_REMINDERS).updateOne({ _id: rem._id }, { $pull: { clans: clanTag } });
	}

	public async deleteClanGamesReminders(clanTag: string, guild: string) {
		const rem = await this.client.db.collection(Collections.CG_REMINDERS).findOne({ guild, clans: clanTag });
		if (!rem) return null;
		await this.client.db.collection(Collections.CG_SCHEDULERS).deleteMany({ reminderId: rem._id });
		if (rem.clans.length === 1) {
			return this.client.db.collection(Collections.CG_REMINDERS).deleteOne({ _id: rem._id });
		}
		return this.client.db.collection(Collections.CG_REMINDERS).updateOne({ _id: rem._id }, { $pull: { clans: clanTag } });
	}

	public async remove(id: string, data: any) {
		if (data.op === Flags.DONATION_LOG) {
			return this.client.db.collection(Collections.DONATION_LOGS).deleteOne({ clanId: new ObjectId(id) });
		}

		if (data.op === Flags.CLAN_FEED_LOG) {
			return this.client.db.collection(Collections.CLAN_FEED_LOGS).deleteOne({ clanId: new ObjectId(id) });
		}

		if (data.op === Flags.LAST_SEEN_LOG) {
			return this.client.db.collection(Collections.LAST_SEEN_LOGS).deleteOne({ clanId: new ObjectId(id) });
		}

		if (data.op === Flags.CLAN_GAMES_LOG) {
			return this.client.db.collection(Collections.CLAN_GAMES_LOGS).deleteOne({ clanId: new ObjectId(id) });
		}

		if (data.op === Flags.CLAN_EMBED_LOG) {
			return this.client.db.collection(Collections.CLAN_EMBED_LOGS).deleteOne({ clanId: new ObjectId(id) });
		}

		if (data.op === Flags.CLAN_WAR_LOG) {
			return this.client.db.collection(Collections.CLAN_WAR_LOGS).deleteOne({ clanId: new ObjectId(id) });
		}

		if (data.op === Flags.LEGEND_LOG) {
			return this.client.db.collection(Collections.LEGEND_LOGS).deleteOne({ clanId: new ObjectId(id) });
		}

		if (data.op === Flags.CAPITAL_LOG) {
			return this.client.db.collection(Collections.CAPITAL_LOGS).deleteOne({ clanId: new ObjectId(id) });
		}

		if (data.op === Flags.JOIN_LEAVE_LOG) {
			return this.client.db.collection(Collections.JOIN_LEAVE_LOGS).deleteOne({ clanId: new ObjectId(id) });
		}

		return null;
	}

	public async getWebhookWorkloads(guild: string) {
		const result = await this.client.db
			.collection(Collections.CLAN_STORES)
			.aggregate<Record<string, { name: string; tag: string; webhook: { id: string; token: string } }[]>>([
				{ $match: { guild: guild } },
				{
					$facet: {
						[Collections.DONATION_LOGS]: [
							{
								$lookup: {
									from: Collections.DONATION_LOGS,
									localField: '_id',
									foreignField: 'clanId',
									as: 'webhook',
									pipeline: [{ $project: { id: '$webhook.id', token: '$webhook.token' } }]
								}
							},
							{
								$unwind: '$webhook'
							},
							{
								$project: {
									tag: 1,
									name: 1,
									webhook: 1
								}
							}
						],
						[Collections.CLAN_FEED_LOGS]: [
							{
								$lookup: {
									from: Collections.CLAN_FEED_LOGS,
									localField: '_id',
									foreignField: 'clanId',
									as: 'webhook',
									pipeline: [{ $project: { id: '$webhook.id', token: '$webhook.token' } }]
								}
							},
							{
								$unwind: '$webhook'
							},
							{
								$project: {
									tag: 1,
									name: 1,
									webhook: 1
								}
							}
						],
						[Collections.JOIN_LEAVE_LOGS]: [
							{
								$lookup: {
									from: Collections.JOIN_LEAVE_LOGS,
									localField: '_id',
									foreignField: 'clanId',
									as: 'webhook',
									pipeline: [{ $project: { id: '$webhook.id', token: '$webhook.token' } }]
								}
							},
							{
								$unwind: '$webhook'
							},
							{
								$project: {
									tag: 1,
									name: 1,
									webhook: 1
								}
							}
						],
						[Collections.LAST_SEEN_LOGS]: [
							{
								$lookup: {
									from: Collections.LAST_SEEN_LOGS,
									localField: '_id',
									foreignField: 'clanId',
									as: 'webhook',
									pipeline: [{ $project: { id: '$webhook.id', token: '$webhook.token' } }]
								}
							},
							{
								$unwind: '$webhook'
							},
							{
								$project: {
									tag: 1,
									name: 1,
									webhook: 1
								}
							}
						],
						[Collections.CLAN_GAMES_LOGS]: [
							{
								$lookup: {
									from: Collections.CLAN_GAMES_LOGS,
									localField: '_id',
									foreignField: 'clanId',
									as: 'webhook',
									pipeline: [{ $project: { id: '$webhook.id', token: '$webhook.token' } }]
								}
							},
							{
								$unwind: '$webhook'
							},
							{
								$project: {
									tag: 1,
									name: 1,
									webhook: 1
								}
							}
						],
						[Collections.CLAN_WAR_LOGS]: [
							{
								$lookup: {
									from: Collections.CLAN_WAR_LOGS,
									localField: '_id',
									foreignField: 'clanId',
									as: 'webhook',
									pipeline: [{ $project: { id: '$webhook.id', token: '$webhook.token' } }]
								}
							},
							{
								$unwind: '$webhook'
							},
							{
								$project: {
									tag: 1,
									name: 1,
									webhook: 1
								}
							}
						],
						[Collections.CLAN_EMBED_LOGS]: [
							{
								$lookup: {
									from: Collections.CLAN_EMBED_LOGS,
									localField: '_id',
									foreignField: 'clanId',
									as: 'webhook',
									pipeline: [{ $project: { id: '$webhook.id', token: '$webhook.token' } }]
								}
							},
							{
								$unwind: '$webhook'
							},
							{
								$project: {
									tag: 1,
									name: 1,
									webhook: 1
								}
							}
						],
						[Collections.LEGEND_LOGS]: [
							{
								$lookup: {
									from: Collections.LEGEND_LOGS,
									localField: '_id',
									foreignField: 'clanId',
									as: 'webhook',
									pipeline: [{ $project: { id: '$webhook.id', token: '$webhook.token' } }]
								}
							},
							{
								$unwind: '$webhook'
							},
							{
								$project: {
									tag: 1,
									name: 1,
									webhook: 1
								}
							}
						],
						[Collections.CAPITAL_LOGS]: [
							{
								$lookup: {
									from: Collections.CAPITAL_LOGS,
									localField: '_id',
									foreignField: 'clanId',
									as: 'webhook',
									pipeline: [{ $project: { id: '$webhook.id', token: '$webhook.token' } }]
								}
							},
							{
								$unwind: '$webhook'
							},
							{
								$project: {
									tag: 1,
									name: 1,
									webhook: 1
								}
							}
						]
					}
				}
			])
			.toArray();

		return result.length ? Object.values(result.at(0)!).flat() : [];
	}

	public async getWebhook(channel: TextChannel | NewsChannel | ForumChannel) {
		const channelWebhooks = await channel.fetchWebhooks();

		const clans = await this.getWebhookWorkloads(channel.guild.id);
		const estimated = channelWebhooks
			.filter((webhook) => webhook.applicationId === this.client.user!.id)
			.map((webhook) => webhook.id)
			.map((webhookId) => {
				const count = clans.reduce((counter, clan) => {
					if (clan.webhook.id === webhookId) counter += 1;
					return counter;
				}, 0);
				return { webhookId, count };
			})
			.sort((a, b) => a.count - b.count)
			.at(0);

		const webhookLimit = this.client.settings.get<number>(channel.guildId, Settings.WEBHOOK_LIMIT, 8);
		if (estimated && (estimated.count <= 6 || channelWebhooks.size >= Math.max(3, Math.min(8, webhookLimit)))) {
			return channelWebhooks.get(estimated.webhookId)!;
		}

		if (channelWebhooks.size >= 10) return null;

		const webhook = await channel.createWebhook({
			name: this.client.user!.username,
			avatar: this.client.user!.displayAvatarURL({ extension: 'png', size: 2048 })
		});
		this.client.logger.debug(`Created webhook for ${channel.guild.name}#${channel.name}`, { label: 'HOOK' });
		return webhook;
	}

	public async getWarTags(tag: string, season?: string | null): Promise<ClanWarLeagueGroupData | null> {
		const data = await this.client.db
			.collection(Collections.CWL_GROUPS)
			.findOne(season ? { 'clans.tag': tag, season } : { 'clans.tag': tag }, { sort: { _id: -1 } });
		if (!data || data.warTags?.[tag]?.length !== data.clans.length - 1) return null;
		if (season) return data as unknown as ClanWarLeagueGroupData;

		if (
			new Date().getMonth() === new Date(data.season as string).getMonth() ||
			(new Date(data.season as string).getMonth() === new Date().getMonth() - 1 && new Date().getDate() <= 8)
		)
			return data as unknown as ClanWarLeagueGroupData;

		return null;
	}

	public async pushWarTags(tag: string, body: ClanWarLeagueGroup) {
		const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));
		if (rounds.length !== body.clans.length - 1) return null;

		const data = await this.client.db
			.collection(Collections.CWL_GROUPS)
			.find({ 'clans.tag': tag })
			.sort({ createdAt: -1 })
			.limit(1)
			.next();
		if (data?.season === this.seasonID) return null;
		if (data && new Date().getMonth() <= new Date(data.season as string).getMonth()) return null;

		const warTags = body.clans.reduce<{ [key: string]: string[] }>((pre, clan) => {
			pre[clan.tag] = [];
			return pre;
		}, {});

		for (const round of rounds) {
			for (const warTag of round.warTags) {
				const data = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;
				if (!warTags[data.clan.tag]!.includes(warTag)) warTags[data.clan.tag]!.push(warTag);
				if (!warTags[data.opponent.tag]!.includes(warTag)) warTags[data.opponent.tag]!.push(warTag);
			}
		}

		// return this.pushToDB(tag, body.clans, warTags, rounds, body.season);
	}

	private md5(id: string) {
		return createHash('md5').update(id).digest('hex');
	}

	// private async pushToDB(_tag: string, clans: { tag: string; name: string }[], warTags: any, rounds: any[], season: string) {
	// 	const uid = this.md5(
	// 		`${season}-${clans
	// 			.map((clan) => clan.tag)
	// 			.sort((a, b) => a.localeCompare(b))
	// 			.join('-')}`
	// 	);
	// 	return this.client.db.collection(Collections.CWL_GROUPS).updateOne(
	// 		{ uid },
	// 		{
	// 			$set: {
	// 				warTags,
	// 				rounds
	// 			},
	// 			$setOnInsert: {
	// 				uid,
	// 				season,
	// 				id: await this.uuid(),
	// 				createdAt: new Date(),
	// 				clans: clans.map((clan) => ({ tag: clan.tag, name: clan.name }))
	// 			}
	// 		},
	// 		{ upsert: true }
	// 	);
	// }

	private async uuid() {
		const cursor = this.client.db.collection(Collections.CWL_GROUPS).find().sort({ id: -1 }).limit(1);

		const uuid: number = (await cursor.next())?.id ?? 0;
		cursor.close();
		return uuid + 1;
	}

	private get seasonID() {
		return new Date().toISOString().substring(0, 7);
	}
}

interface ClanWarLeagueGroupData extends ClanWarLeagueGroup {
	leagues?: Record<string, number>;
}
