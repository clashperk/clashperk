const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

		if (!clans.length) {
			return message.util.send({
				embed: {
					description: 'Not enough data available to show the graph, make sure last online board is enabled or try again after some hours.'
				}
			});
		}

		const Tz = await mongodb.db('clashperk')
			.collection('timezoneoffset')
			.findOne({ user: message.author.id });
		const tz = Tz?.timezone ?? { offset: 0, name: 'Coordinated Universal Time' };
		const datasets = clans.map(clan => ({ name: clan.name, data: this.datasets(clan, tz.offset) }));

		const hrStart = process.hrtime();
		const buffer = await Chart.clanActivity(datasets, dark, [`Online Members Per Hour (${tz.name})`]);
		if (!buffer) return message.util.send({ embed: { description: '504 Request Timeout' } });

		const diff = process.hrtime(hrStart);
		const sec = diff[0] > 0 ? `${diff[0].toFixed(2)} sec` : null;
		return message.util.send({
			files: [{ attachment: Buffer.from(buffer), name: 'activity.png' }],
			content: [
				Tz
					? `**Rendered in ${sec || `${(diff[1] / 1000000).toFixed(2)} ms`}**`
					: `**Set your time zone using \`${this.handler.prefix(message)}offset <location>\` for better experience.**`
			].join('\n')
		});
	}

	async aggregationQuery(tags) {
		const db = mongodb.db('clashperk').collection('lastonlines');
		return db.aggregate([
			{
				'$match': {
					'clan.tag': { '$in': [...tags] },
					'entries': {
						'$exists': true
					}
				}
			},
			{
				'$project': {
					'tag': '$tag',
					'clan': '$clan',
					'entries': {
						'$filter': {
							'input': '$entries',
							'as': 'en',
							'cond': {
								'$gte': [
									'$$en.entry', new Date(new Date().getTime() - (24 * 60 * 60 * 1000))
								]
							}
						}
					}
				}
			},
			{
				'$unwind': {
					'path': '$entries'
				}
			},
			{
				'$group': {
					'_id': {
						'id': '$entries.entry',
						'clan': '$clan',
						'tag': '$tag'
					}
				}
			},
			{
				'$group': {
					'_id': {
						'id': '$_id.id',
						'clan': '$_id.clan'
					},
					'count': {
						'$sum': 1
					}
				}
			},
			{
				'$group': {
					'_id': '$_id.clan.tag',
					'entries': {
						'$addToSet': {
							'time': {
								'$dateToString': {
									'format': '%Y-%m-%dT%H:00',
									'date': '$_id.id'
								}
							},
							'count': '$count'
						}
					},
					'name': {
						'$first': '$_id.clan.name'
					}
				}
			}
		]).toArray();
	}

	datasets(data, offset) {
		const dataSet = new Array(24).fill()
			.map((_, i) => {
				const decrement = new Date() - (60 * 60 * 1000 * i);
				const timeObj = new Date(decrement).toISOString()
					.substring(0, 14)
					.concat('00');
				const id = data.entries.find(e => e.time === timeObj);
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
				short: (i + 1) % 2 === 0 ? hour : '',
				count: a.count
			};
		});
	}

	format(time, month = null) {
		const hour = time.getHours();
		const min = time.getMinutes();
		const date = time.getDate();
		if (month) return `${date.toString().padStart(2, '0')} ${months[month]}`;
		return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
	}
}

module.exports = ActivityCommand;
