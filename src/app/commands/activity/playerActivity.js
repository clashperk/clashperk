const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const { MessageAttachment, MessageEmbed } = require('discord.js');
const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
const Chart = require('../../core/ChartHandler');

class ActivityCommand extends Command {
	constructor() {
		super('player-activity', {
			aliases: ['pav'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'ATTACH_FILES'],
			description: {
				content: [
					'Shows per day activity graph for clan members.',
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
				const resolved = await Resolver.resolve(message, args, true);
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
		tags.splice(2);
		const items = await this.aggregationQuery(tags.map(tag => `#${tag.toUpperCase().replace(/^#/g, '').replace(/O|o/g, '0')}`));

		if (!items.length) {
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
		const datasets = items.map(clan => ({ name: clan.name, data: this.datasets(clan, tz.offset) }));

		const buffer = await Chart.playerActivity(datasets, dark, [`Per Day Activities (${tz.name})`]);
		if (!buffer) return message.util.send({ embed: { description: '504 Request Timeout' } });

		const file = new MessageAttachment(buffer, 'activity.png');
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setImage('attachment://activity.png');
		if (items.length === 1) {
			embed.setAuthor(`${items[0].name} (${items[0]._id})`)
				.setFooter('Last Seen')
				.setTimestamp(items[0].lastSeen);
		}
		return message.util.send({ embed, files: [file] });
	}

	async aggregationQuery(tags) {
		const db = mongodb.db('clashperk').collection('lastonlines');
		return db.aggregate([
			{
				'$match': {
					'tag': { '$in': [...tags] }
				}
			},
			{
				'$project': {
					'tag': '$tag',
					'name': '$name',
					'lastSeen': '$lastSeen',
					'entries': {
						'$filter': {
							'input': '$entries',
							'as': 'en',
							'cond': {
								'$gte': [
									'$$en.entry', new Date(new Date().getTime() - (7 * 24 * 60 * 60 * 1000))
								]
							}
						}
					}
				}
			},
			{
				'$project': {
					'tag': '$tag',
					'name': '$name',
					'lastSeen': '$lastSeen',
					'entries': {
						'$map': {
							'input': '$entries',
							'as': 'en',
							'in': {
								'date': {
									'$dateToString': {
										'format': '%Y-%m-%d',
										'date': '$$en.entry'
									}
								},
								'count': '$$en.count'
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
						'tag': '$tag',
						'id': '$entries.date',
						'name': '$name',
						'lastSeen': '$lastSeen'
					},
					'count': {
						'$sum': '$entries.count'
					}
				}
			},
			{
				'$group': {
					'_id': '$_id.tag',
					'entries': {
						'$addToSet': {
							'time': '$_id.id',
							'count': '$count'
						}
					},
					'name': {
						'$first': '$_id.name'
					},
					'lastSeen': {
						'$first': '$_id.lastSeen'
					}
				}
			}
		]).toArray();
	}

	datasets(data, offset) {
		const dataSet = new Array(7).fill()
			.map((_, i) => {
				const decrement = new Date() - (24 * 60 * 60 * 1000 * i);
				const timeObj = new Date(decrement).toISOString()
					.substring(0, 10);
				const id = data.entries.find(e => e.time === timeObj);
				if (id) return { time: id.time, count: id.count };
				return {
					time: timeObj,
					count: 0
				};
			});

		return dataSet.reverse().map(a => {
			const date = new Date(new Date(a.time).getTime() + (offset * 1000));
			return {
				short: `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}`,
				count: a.count
			};
		});
	}
}

module.exports = ActivityCommand;
