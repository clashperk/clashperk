import { Command, PrefixSupplier } from 'discord-akairo';
import { Collections } from '@clashperk/node';
import Chart from '../../core/ChartHandler';
import { Message } from 'discord.js';

const months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// TODO: Fix TS
export default class ClanActivityCommand extends Command {
	public constructor() {
		super('activity', {
			aliases: ['activity', 'av'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'ATTACH_FILES'],
			description: {
				content: [
					'Shows active members per hour graph for clans.',
					'',
					'Maximum 3 clans are accepted.',
					'',
					'Set your timezone using **offset** command for better experience.'
				],
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '#8QU8J9LP #8UUYQ92L']
			},
			args: [
				{
					id: 'tags',
					match: 'content',
					type: async (msg, args) => {
						const tags = args ? args.split(/ +/g) : [];
						if (args && tags.length > 1) return args.split(/ +/g);
						return this.client.resolver.resolveClan(msg, args);
					}
				},
				{
					id: 'dark',
					match: 'flag',
					flag: ['--dark']
				}
			]
		});
	}

	private async getClans(message: Message, aliases: string[]) {
		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({
				$or: [
					{
						tag: { $in: aliases.map(tag => this.fixTag(tag)) }
					},
					{
						guild: message.guild!.id,
						alias: { $in: aliases.map(alias => alias.toLowerCase()) }
					}
				]
			})
			.toArray();

		return clans.map(clan => clan.tag);
	}

	private fixTag(tag: string) {
		return `#${tag.toUpperCase().replace(/^#/g, '').replace(/O|o/g, '0')}`;
	}

	public async exec(message: Message, { tags, dark }: { tags: string[] | string; dark: boolean }) {
		// @ts-expect-error
		if (!Array.isArray(tags)) tags = [tags.tag];
		tags.splice(3);
		if (!tags.length) return;

		const clanTags = await this.getClans(message, tags);
		if (!clanTags.length) {
			return message.util!.send(`*No clans found in my database for the specified argument.*`);
		}

		const clans = await this.aggregationQuery(clanTags);
		if (!clans.length) return message.util!.send('*Not enough data available a this moment!*');

		const timeZone = await this.client.db.collection(Collections.TIME_ZONES).findOne({ user: message.author.id });
		const tz = timeZone?.timezone ?? { offset: 0, name: 'Coordinated Universal Time' };
		const datasets = clans.map(clan => ({ name: clan.name, data: this.datasets(clan, tz.offset) }));

		const hrStart = process.hrtime();
		const buffer = await Chart.clanActivity(datasets, dark as any, [`Active Members Per Hour (${tz.name as string})`] as any);
		const diff = process.hrtime(hrStart);

		return message.util!.send({
			files: [{ attachment: Buffer.from(buffer), name: 'activity.png' }],
			content: [
				timeZone
					? `_Rendered in ${((diff[0] * 1000) + (diff[1] / 1000000)).toFixed(2)}ms_`
					: `_Set your timezone using \`${(this.handler.prefix as PrefixSupplier)(message) as string}offset <location>\` for better experience._`
			].join('\n')
		});
	}

	private aggregationQuery(clanTags: string[]) {
		return this.client.db.collection(Collections.LAST_SEEN).aggregate([
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
								$gte: [
									'$$en.entry', new Date(new Date().getTime() - (24 * 60 * 60 * 1000))
								]
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
				$group: {
					_id: {
						id: '$entries.entry',
						clan: '$clan',
						tag: '$tag'
					}
				}
			},
			{
				$group: {
					_id: {
						id: '$_id.id',
						clan: '$_id.clan'
					},
					count: {
						$sum: 1
					}
				}
			},
			{
				$group: {
					_id: '$_id.clan.tag',
					entries: {
						$addToSet: {
							time: {
								$dateToString: {
									format: '%Y-%m-%dT%H:00',
									date: '$_id.id'
								}
							},
							count: '$count'
						}
					},
					name: {
						$first: '$_id.clan.name'
					}
				}
			}
		]).toArray();
	}

	private datasets(data: any, offset: any) {
		const dataSet = new Array(24).fill('💩')
			.map((_, i) => {
				const decrement = new Date().getTime() - (60 * 60 * 1000 * i);
				const timeObj = new Date(decrement).toISOString()
					.substring(0, 14)
					.concat('00');
				const id = data.entries.find((e: any) => e.time === timeObj);
				if (id) return { time: id.time, count: id.count };
				return {
					time: timeObj,
					count: 0
				};
			});

		return dataSet.reverse().map((a, i) => {
			const time = new Date(new Date(a.time).getTime() + (offset * 1000));
			let hour = this.format(time);
			if (time.getHours() === 0) hour = this.format(time, time.getMonth());
			if (time.getHours() === 1) hour = this.format(time, time.getMonth());

			return {
				'short': (i + 1) % 2 === 0 ? hour : '',
				'count': a.count
			};
		});
	}

	private format(time: Date, month: number | null = null) {
		const hour = time.getHours();
		const min = time.getMinutes();
		const date = time.getDate();
		if (month) return `${date.toString().padStart(2, '0')} ${months[month]}`;
		return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
	}
}
