import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import Chart from '../../struct/ChartHandler.js';
import { UserInfoModel } from '../../types/index.js';
import Google from '../../struct/Google.js';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

		if (!clans.length && tags.length) return interaction.editReply(this.i18n('common.no_clans_found', { lng: interaction.locale }));
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const result = await this.aggregate(
			clans.map((clan) => clan.tag),
			args.days ?? 1
		);
		if (!result.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

		const timezone = await this.getTimezoneOffset(interaction, args.timezone);
		const datasets = result.map((clan) => ({ name: clan.name, data: this.datasets(clan, timezone.offset, args.days ?? 1) }));

		const hrStart = process.hrtime();
		const url = await Chart.activity(
			datasets,
			[`${this.i18n('command.activity.title', { lng: interaction.locale })} (${timezone.name})`],
			args.days
		);
		const diff = process.hrtime(hrStart);

		this.client.logger.debug(`Rendered in ${(diff[0] * 1000 + diff[1] / 1000000).toFixed(2)}ms`, { label: 'CHART' });
		return interaction.editReply({
			content:
				timezone.offset === 0
					? `Please set your time zone with the </timezone:1051836259527565348> command. It enables you to view the graphs in your time zone.\n${url}`
					: `${url}`
		});
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
								unit: 'hour'
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
						count: {
							$sum: 1
						},
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
								time: {
									$dateToString: {
										format: '%Y-%m-%dT%H:00',
										date: '$hour'
									}
								},
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

	private datasets(data: any, offset: any, days = 1) {
		const dataSets: { count: number; time: string }[] = new Array(days * 24).fill(0).map((_, i) => {
			const decrement = new Date().getTime() - 60 * 60 * 1000 * i;
			const timeObj = new Date(decrement).toISOString().substring(0, 14).concat('00');
			const id = data.entries.find((e: any) => e.time === timeObj);
			if (id) return { time: id.time, count: id.count };
			return {
				time: timeObj,
				count: 0
			};
		});

		return dataSets.reverse().map((a, i) => {
			const time = new Date(new Date(a.time).getTime() + offset * 1000);
			let hour = this.format(time, days > 7 ? time.getMonth() : null);
			if (time.getHours() === 0) hour = this.format(time, time.getMonth());
			if (time.getHours() === 1) hour = this.format(time, time.getMonth());

			return {
				short: (i + 1) % 2 === 0 ? hour : [1].includes(days) ? '' : hour,
				count: a.count
			};
		});
	}

	private format(time: Date, month: number | null = null) {
		const hour = time.getHours();
		const min = time.getMinutes();
		const date = time.getDate();
		if (typeof month === 'number') return `${date.toString().padStart(2, '0')} ${months[month]}`;
		return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
	}
}
