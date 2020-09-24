const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
const Chart = require('../../core/ChartHandler');

class ActivityCommand extends Command {
	constructor() {
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
			flags: ['--dark']
		});
	}

	*args() {
		const tags = yield {
			type: async (message, args) => {
				const tags = args ? args.split(/ +/g) : [];
				if (args && tags.length > 1) return args.split(/ +/g);
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return [resolved.tag];
			},
			match: 'content'
		};

		const dark = yield {
			match: 'flag',
			flag: ['--dark']
		};

		return { tags, dark };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 3000;
		return 5000;
	}

	async exec(message, { tags, dark }) {
		if (!tags.length) return;
		tags.splice(3);
		const clans = await this.aggregationQuery(tags.map(tag => `#${tag.toUpperCase().replace(/^#/g, '').replace(/O|o/g, '0')}`));

		console.log(clans);
		if (!clans.length) {
			return message.util.send({
				embed: {
					description: 'Not enough data available to show the graph, make sure last online board is enabled or try again after some hours.'
				}
			});
		}

		const raw = await mongodb.db('clashperk')
			.collection('timezoneoffset')
			.findOne({ user: message.author.id });
		const hrStart = process.hrtime();
		const buffer = await Chart.chart(clans, raw ? raw.timezone : { offset: 0, name: 'Coordinated Universal Time' }, dark);
		if (!buffer) return message.util.send({ embed: { description: '504 Request Timeout' } });
		const diff = process.hrtime(hrStart);
		const sec = diff[0] > 0 ? `${diff[0].toFixed(2)} sec` : null;
		return message.util.send({
			files: [{ attachment: Buffer.from(buffer), name: 'activity.png' }],
			content: [
				raw
					? `**Rendered in ${sec || `${(diff[1] / 1000000).toFixed(2)} ms`}**`
					: `**Set your time zone using \`${this.handler.prefix(message)}offset <location>\` for better experience.**`
			].join('\n')
		});
	}

	async aggregationQuery(tags) {
		console.log(tags);
		const db = mongodb.db('clashperk').collection('lastonlines');
		return db.aggregate([
			{
				$match: { 'clan.tag': { $in: [...tags] } }
			},
			{
				$project: {
					clan: '$clan',
					timestamps: {
						$filter: {
							input: '$timestamps',
							as: 'timestamp',
							cond: {
								$gte: [
									'$$timestamp', new Date(new Date().getTime() - (24 * 60 * 60 * 1000))
								]
							}
						}
					}
				}
			},
			{
				$project: {
					clan: '$clan',
					dates: {
						$map: {
							input: '$timestamps',
							as: 'timestamp',
							in: {
								time: {
									$dateToString: {
										format: '%Y-%m-%dT%H:00',
										date: '$$timestamp'
									}
								}
							}
						}
					}
				}
			},
			{
				$unwind: {
					path: '$dates'
				}
			},
			{
				$group: {
					_id: {
						id: '$dates.time',
						clan: '$clan'
					},
					count: {
						$sum: 1
					}
				}
			},
			{
				$group: {
					_id: '$_id.clan',
					entries: {
						$addToSet: {
							time_: {
								$dateFromString: {
									dateString: '$_id.id'
								}
							},
							time: '$_id.id',
							count: '$count'
						}
					}
				}
			},
			{
				$addFields: {
					name: '$_id.name'
				}
			}
		]).toArray();
	}
}

module.exports = ActivityCommand;
