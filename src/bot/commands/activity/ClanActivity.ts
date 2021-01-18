import { Command, PrefixSupplier } from 'discord-akairo';
import { COLLECTIONS } from '../../util/Constants';
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
					'Shows online members per hour graph for clans.',
					'',
					'Maximum 3 clan tags are accepted.',
					'',
					'Set your time zone using **offset** command for better experience.'
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

	public async exec(message: Message, { tags, dark }: { tags: string[] | string; dark: boolean }) {
		// @ts-expect-error
		if (!Array.isArray(tags)) tags = [tags.tag];
		tags.splice(3);
		if (!tags.length) return;

		const clans = await this.aggregationQuery(tags.map(tag => `#${tag.toUpperCase().replace(/^#/g, '').replace(/O|o/g, '0')}`));
		if (!clans.length) {
			return message.util!.send({
				embed: {
					description: 'Not enough data available to show the graph, make sure last online board is enabled or try again after some hours.'
				}
			});
		}

		const Tz = await this.client.db.collection(COLLECTIONS.TIME_ZONES)
			.findOne({ user: message.author.id });
		const tz = Tz?.timezone ?? { offset: 0, name: 'Coordinated Universal Time' };
		const datasets = clans.map(clan => ({ name: clan.name, data: this.datasets(clan, tz.offset) }));

		const hrStart = process.hrtime();
		const buffer = await Chart.clanActivity(datasets, dark as any, [`Online Members Per Hour (${tz.name as string})`] as any);
		const diff = process.hrtime(hrStart);

		return message.util!.send({
			files: [{ attachment: Buffer.from(buffer), name: 'activity.png' }],
			content: [
				Tz
					? `**Rendered in ${((diff[0] * 1000) + (diff[1] / 1000000)).toFixed(2)} ms**`
					: `**Set your time zone using \`${(this.handler.prefix as PrefixSupplier)(message) as string}offset <location>\` for better experience.**`
			].join('\n')
		});
	}

	private aggregationQuery(tags: any[]) {
		return this.client.db.collection(COLLECTIONS.LAST_ONLINES).aggregate([
			{
				$match: {
					'clan.tag': { $in: [...tags] },
					'entries': {
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
