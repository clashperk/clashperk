import { AttachmentBuilder, CommandInteraction } from 'discord.js';
import fetch from 'node-fetch';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { UserInfoModel } from '../../types/index.js';
import Google from '../../struct/Google.js';

export default class ClanActivityCommand extends Command {
	public constructor() {
		super('activity', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'AttachFiles'],
			description: {
				content: ['Graph of hourly active clan members.']
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; days?: number; timezone?: string }) {
		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? (await this.client.storage.search(interaction.guild.id, tags)).slice(0, 7)
			: (await this.client.storage.find(interaction.guild.id)).slice(0, 7);

		if (!clans.length && tags.length)
			return interaction.editReply(
				this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const result = await this.aggregate(
			clans.map((clan) => clan.tag),
			args.days ?? 1
		);

		if (!result.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
		const timezone = await this.getTimezoneOffset(interaction, args.timezone);

		const days = args.days ?? 1;
		const itemCount = days === 1 ? 24 : 1;
		const dataLabel = new Array(days * itemCount)
			.fill(0)
			.map((_, i) => {
				const decrement = new Date().getTime() - (days === 1 ? 60 * 60 * 1000 : 60 * 60 * 1000 * 24) * i;
				const key =
					days === 1
						? moment(decrement).minutes(0).seconds(0).milliseconds(0).toISOString()
						: moment(decrement).hours(0).minutes(0).seconds(0).milliseconds(0).toISOString();
				return {
					key,
					timestamp: new Date(new Date(key).getTime() + timezone.offset * 1000)
				};
			})
			.reverse();

		const datasets = result.map((clan) => ({
			name: clan.name,
			data: this.datasets(dataLabel, clan)
		}));

		const hrStart = process.hrtime();
		const arrayBuffer = await fetch(`${process.env.ASSET_API_BACKEND!}/clans/activity`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				labels: dataLabel.map((d) => d.timestamp),
				datasets,
				title: `Active Members Per Hour (${timezone.name})`
			})
		}).then((res) => res.arrayBuffer());

		const rawFile = new AttachmentBuilder(Buffer.from(arrayBuffer), {
			name: 'chart.png'
		});

		await interaction.editReply({
			content:
				timezone.offset === 0
					? `Please set your time zone with the ${this.client.getCommand(
							'/timezone'
					  )} command. It enables you to view the graphs in your time zone.`
					: null,
			files: [rawFile]
		});

		const diff = process.hrtime(hrStart);
		this.client.logger.debug(`Rendered in ${(diff[0] * 1000 + diff[1] / 1000000).toFixed(2)}ms`, { label: 'CHART' });
	}

	private async getTimezoneOffset(interaction: CommandInteraction<'cached'>, location?: string) {
		const user = await this.client.db.collection<UserInfoModel>(Collections.USERS).findOne({ userId: interaction.user.id });
		if (!location) {
			if (!user?.timezone) return { offset: 0, name: 'Coordinated Universal Time' };
			return { offset: user.timezone.offset, name: user.timezone.name };
		}

		const raw = await Google.timezone(location);
		if (!raw) return { offset: 0, name: 'Coordinated Universal Time' };

		const offset = Number(raw.timezone.rawOffset) + Number(raw.timezone.dstOffset);
		if (!user?.timezone) {
			await this.client.db.collection<UserInfoModel>(Collections.USERS).updateOne(
				{ userId: interaction.user.id },
				{
					$set: {
						username: interaction.user.tag,
						timezone: {
							id: raw.timezone.timeZoneId,
							offset: Number(offset),
							name: raw.timezone.timeZoneName,
							location: raw.location.formatted_address
						}
					},
					$setOnInsert: { createdAt: new Date() }
				},
				{ upsert: true }
			);
		}

		return { offset, name: raw.timezone.timeZoneName };
	}

	private aggregate(clanTags: string[], days = 1) {
		return this.client.db
			.collection(Collections.LAST_SEEN)
			.aggregate([
				{
					$match: {
						'clan.tag': { $in: clanTags }
					}
				},
				{
					$match: {
						entries: {
							$exists: true
						}
					}
				},
				{
					$project: {
						tag: '$tag',
						clan: '$clan',
						entries: {
							$filter: {
								input: '$entries',
								as: 'en',
								cond: {
									$gte: ['$$en.entry', new Date(Date.now() - days * 24 * 60 * 60 * 1000)]
								}
							}
						}
					}
				},
				{
					$unwind: {
						path: '$entries'
					}
				},
				{
					$set: {
						tag: '$tag',
						name: '$name',
						clan: '$clan',
						time: '$entries.entry',
						count: '$entries.count'
					}
				},
				{
					$set: {
						hour: {
							$dateTrunc: {
								date: '$time',
								unit: days === 1 ? 'hour' : 'day'
							}
						}
					}
				},
				{
					$sort: {
						time: -1
					}
				},
				{
					$group: {
						_id: {
							hour: '$hour',
							clan: '$clan.tag'
						},
						clan: {
							$last: '$clan'
						},
						tag: {
							$last: '$tag'
						},
						name: {
							$last: '$name'
						},
						count: days === 1 ? { $sum: 1 } : { $max: '$count' },
						hour: {
							$last: '$hour'
						}
					}
				},
				{
					$sort: {
						hour: -1
					}
				},
				{
					$group: {
						_id: '$_id.clan',
						entries: {
							$push: {
								time: '$hour',
								count: '$count'
							}
						},
						name: {
							$first: '$clan.name'
						}
					}
				},
				{
					$sort: {
						name: 1
					}
				}
			])
			.toArray();
	}

	private datasets(dataLabel: any[], data: any) {
		return dataLabel.map(({ key }) => {
			const id = data.entries.find((e: any) => e.time.toISOString() === key);
			return id?.count ?? 0;
		});
	}

	private async leaveJoinGraph(interaction: CommandInteraction<'cached'>, clanTag: string) {
		await this.client.elastic.search({
			size: 0,
			from: 0,
			query: {
				match: {
					clan_tag: clanTag
				}
			},
			aggs: {
				dates: {
					date_histogram: {
						field: 'created_at',
						calendar_interval: '1d',
						min_doc_count: 0
					},
					aggs: {
						events: {
							terms: {
								field: 'op'
							}
						}
					}
				}
			}
		});
	}
}
