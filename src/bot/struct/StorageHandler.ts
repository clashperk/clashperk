import { APIClanWarLeagueGroup } from 'clashofclans.js';
import { CommandInteraction, ForumChannel, MediaChannel, NewsChannel, TextChannel } from 'discord.js';
import { Collection, ObjectId, WithId } from 'mongodb';
import fetch from 'node-fetch';
import { createHash } from 'node:crypto';
import { ClanCategoriesEntity } from '../entities/clan-categories.entity.js';
import { ClanStoresEntity } from '../entities/clan-stores.entity.js';
import { Collections, Flags, Settings, UnrankedWarLeagueId } from '../util/Constants.js';
import { Reminder, Schedule } from './ClanWarScheduler.js';
import { Client } from './Client.js';

export interface ClanStore extends ClanStoresEntity {}

export interface ClanCategories extends ClanCategoriesEntity {}

export const defaultCategories = ['War', 'CWL', 'Farming', 'Esports', 'Events'];

export default class StorageHandler {
	public collection: Collection<ClanStore>;

	public constructor(private readonly client: Client) {
		this.collection = client.db.collection(Collections.CLAN_STORES);
	}

	public async find(guildId: string) {
		const key = this.client.settings.get<string>(guildId, Settings.CLANS_SORTING_KEY, 'name');
		return this.collection.find({ guild: guildId }, { sort: { [key]: 1 } }).toArray();
	}

	public async getEnabledFeatures(id: string, collection: Collections) {
		return this.client.db
			.collection(collection)
			.aggregate([
				{ $match: { guild: id } },
				{ $lookup: { from: Collections.CLAN_STORES, localField: 'clanId', foreignField: '_id', as: 'root' } },
				{ $unwind: { path: '$root', preserveNullAndEmptyArrays: true } },
				{ $match: { root: { $exists: true } } }
			])
			.toArray();
	}

	public async cleanUpDeletedLogs(collection: Collections) {
		const result = await this.client.db
			.collection(collection)
			.aggregate([
				{ $lookup: { from: Collections.CLAN_STORES, localField: 'clanId', foreignField: '_id', as: 'root' } },
				{ $unwind: { path: '$root', preserveNullAndEmptyArrays: true } },
				{ $match: { root: { $exists: false } } }
			])
			.toArray();
		await this.client.db.collection(collection).deleteMany({ _id: { $in: result.map((doc) => doc._id) } });
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

	public formatCategoryName(name: string) {
		return name.toLowerCase().trim().replace(/\s+/g, '_');
	}

	public async findOrCreateCategory({ guildId, category }: { guildId: string; category?: string }) {
		if (!category) return null;

		const collection = this.client.db.collection<ClanCategories>(Collections.CLAN_CATEGORIES);

		const formattedName = this.formatCategoryName(category);
		if (ObjectId.isValid(category)) {
			const result = await collection.findOne({ guildId, _id: new ObjectId(category) });

			return result?._id ?? null;
		}

		const lastCategory = await collection.findOne({ guildId }, { sort: { order: -1 } });

		const { value } = await collection.findOneAndUpdate(
			{ guildId, name: formattedName },
			{
				$set: { displayName: category.trim(), guildId, name: formattedName, order: (lastCategory?.order ?? 0) + 1 }
			},
			{ upsert: true, returnDocument: 'after' }
		);
		return value?._id ?? null;
	}

	public async getOrCreateDefaultCategories(guildId: string) {
		const categories = await this.client.db
			.collection<ClanCategories>(Collections.CLAN_CATEGORIES)
			.find({ guildId })
			.sort({ order: 1 })
			.toArray();

		if (!categories.length) {
			const payload = defaultCategories.map((name, i) => ({
				_id: new ObjectId(),
				guildId,
				order: i + 1,
				name: name.toLowerCase(),
				displayName: name
			}));
			await this.client.db.collection<ClanCategories>(Collections.CLAN_CATEGORIES).insertMany(payload);
			return payload.map((result) => ({ value: result._id.toHexString(), name: result.displayName, order: result.order }));
		}

		return categories.map((result) => ({ value: result._id.toHexString(), name: result.displayName, order: result.order }));
	}

	private fixTag(tag: string) {
		return `#${tag.toUpperCase().replace(/^#/g, '').replace(/O/g, '0')}`;
	}

	public async register(message: CommandInteraction, data: any) {
		const [_total, _clan, _lastClan] = await Promise.all([
			this.collection.countDocuments({ guild: message.guild!.id }),
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
					order: _total + 1,
					categoryId: data.categoryId,
					...(data.hexCode ? { color: data.hexCode } : {}),
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
		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS).find({ guild, clans: clanTag }).toArray();
		if (!reminders.length) return null;
		for (const rem of reminders) {
			await this.client.db.collection<Schedule>(Collections.SCHEDULERS).deleteMany({ reminderId: rem._id });
			if (rem.clans.length === 1) {
				await this.client.db.collection(Collections.REMINDERS).deleteOne({ _id: rem._id });
			} else {
				await this.client.db.collection(Collections.REMINDERS).updateOne({ _id: rem._id }, { $pull: { clans: clanTag } });
			}
		}
	}

	public async deleteCapitalReminders(clanTag: string, guild: string) {
		const reminders = await this.client.db.collection(Collections.RAID_REMINDERS).find({ guild, clans: clanTag }).toArray();
		if (!reminders.length) return null;
		for (const rem of reminders) {
			await this.client.db.collection(Collections.RAID_SCHEDULERS).deleteMany({ reminderId: rem._id });
			if (rem.clans.length === 1) {
				await this.client.db.collection(Collections.RAID_REMINDERS).deleteOne({ _id: rem._id });
			} else {
				await this.client.db.collection(Collections.RAID_REMINDERS).updateOne({ _id: rem._id }, { $pull: { clans: clanTag } });
			}
		}
	}

	public async deleteClanGamesReminders(clanTag: string, guild: string) {
		const reminders = await this.client.db.collection(Collections.CG_REMINDERS).find({ guild, clans: clanTag }).toArray();
		if (!reminders.length) return null;
		for (const rem of reminders) {
			await this.client.db.collection(Collections.CG_SCHEDULERS).deleteMany({ reminderId: rem._id });
			if (rem.clans.length === 1) {
				await this.client.db.collection(Collections.CG_REMINDERS).deleteOne({ _id: rem._id });
			} else {
				await this.client.db.collection(Collections.CG_REMINDERS).updateOne({ _id: rem._id }, { $pull: { clans: clanTag } });
			}
		}
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

	public async getWebhook(channel: TextChannel | NewsChannel | ForumChannel | MediaChannel | MediaChannel) {
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
			name: this.client.user!.displayName,
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

	public async pushWarTags(tag: string, body: APIClanWarLeagueGroup) {
		const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));
		if (rounds.length !== body.clans.length - 1) return null;

		const data = await this.client.db.collection(Collections.CWL_GROUPS).findOne({ 'clans.tag': tag }, { sort: { _id: -1 } });
		if (data?.season === this.seasonID) return null;
		if (data && new Date().getMonth() <= new Date(data.season as string).getMonth()) return null;

		const warTags = body.clans.reduce<{ [key: string]: string[] }>((pre, clan) => {
			pre[clan.tag] = [];
			return pre;
		}, {});

		for (const round of rounds) {
			for (const warTag of round.warTags) {
				const { body: data, res } = await this.client.http.getClanWarLeagueRound(warTag);
				if (!res.ok) continue;
				if (!warTags[data.clan.tag].includes(warTag)) warTags[data.clan.tag]!.push(warTag);
				if (!warTags[data.opponent.tag].includes(warTag)) warTags[data.opponent.tag]!.push(warTag);
			}
		}

		// return this.pushToDB(tag, body.clans, warTags, rounds, body.season);
	}

	private md5(id: string) {
		return createHash('md5').update(id).digest('hex');
	}

	private async pushToDB(_tag: string, clans: { tag: string; name: string }[], warTags: any, rounds: any[], season: string) {
		const uid = this.md5(
			`${season}-${clans
				.map((clan) => clan.tag)
				.sort((a, b) => a.localeCompare(b))
				.join('-')}`
		);

		const { leagues, clans: _clans } = await this.leagueIds(clans, season);
		if (clans.length !== _clans.length) return null;

		return this.client.db.collection(Collections.CWL_GROUPS).updateOne(
			{ uid },
			{
				$set: {
					warTags,
					rounds
				},
				$setOnInsert: {
					uid,
					season,
					id: await this.uuid(),
					clans: clans.map((clan) => ({ tag: clan.tag, name: clan.name, leagueId: leagues[clan.tag] })),
					leagues,
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);
	}

	private async leagueIds(_clans: { tag: string }[], seasonId: string) {
		const clans = (await this.client.http._getClans(_clans)).map((data) => {
			const leagueId = data.warLeague?.id ?? UnrankedWarLeagueId;
			return { name: data.name, tag: data.tag, leagueId };
		});

		const leagues = clans.reduce<Record<string, number>>((acc, curr) => {
			acc[curr.tag] = curr.leagueId;
			return acc;
		}, {});

		for (const clan of clans) {
			const res = await fetch(`https://api.clashperk.com/clans/${encodeURIComponent(clan.tag)}/cwl/seasons`);
			const seasons = (await res.json()) as { leagueId: string; seasonId: string }[];
			const season = seasons.find((season) => season.seasonId === seasonId);
			if (!season?.leagueId) continue;
			leagues[clan.tag] = Number(season.leagueId);
		}

		return { clans, leagues };
	}

	private async uuid() {
		const cursor = this.client.db.collection(Collections.CWL_GROUPS).find().sort({ id: -1 }).limit(1);
		const uuid: number = (await cursor.next())?.id ?? 0;
		return uuid + 1;
	}

	private get seasonID() {
		return new Date().toISOString().substring(0, 7);
	}
}

interface ClanWarLeagueGroupData extends APIClanWarLeagueGroup {
	leagues?: Record<string, number>;
}
