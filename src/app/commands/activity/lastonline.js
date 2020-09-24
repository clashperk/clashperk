const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
const moment = require('moment');
require('moment-duration-format');

class LastOnlineCommand extends Command {
	constructor() {
		super('lastonline', {
			aliases: ['lastonline', 'lastseen', 'lo'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows an approximate last-online time of clan members.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 3000;
		return 5000;
	}

	async exec(message, { data }) {
		const db = await mongodb.db('clashperk').collection('lastonlines').countDocuments({ 'clan.tag': data.tag });
		if (!db) {
			return message.util.send({
				embed: {
					description: 'Not enough data available to show the board, make sure last online board is enabled or try again after some hours.'
				}
			});
		}

		const members = await this.aggregationQuery(data);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'Last-Online Times & Last 24h Activities',
				`\`\`\`\u200e${'LAST-ON'.padStart(7, ' ')}  📊  ${'NAME'}\n${members
					.map(m => `${m.lastSeen ? this.format(m.lastSeen + 1e3).padStart(7, ' ') : ''.padStart(7, ' ')}  ${(m.count > 99 ? 99 : m.count).toString().padStart(2, ' ')}  ${m.name}`)
					.join('\n')}`,
				data.members > members.length
					? `.......  ${data.members - members.length}  Untracked members\`\`\``
					: '```'
			])
			.setFooter(`Members [${data.members}/50]`, this.client.user.displayAvatarURL());

		return message.util.send({ embed });
	}

	padEnd(data) {
		return data.padEnd(20, ' ');
	}

	filter(clan, db) {
		if (!db?.members) {
			return clan.memberList.map(m => ({ tag: m.tag, name: m.name, lastSeen: null, count: 0 }));
		}

		const members = clan.memberList.map(m => {
			const data = db.members.find(d => d.tag === m.tag);
			return {
				tag: m.tag,
				name: m.name,
				count: data ? data.count : 0,
				lastSeen: data ? new Date() - new Date(data.lastSeen) : null
			};
		});

		members.sort((a, b) => a.lastSeen - b.lastSeen);
		return members.filter(m => m.lastSeen).concat(members.filter(m => !m.lastSeen));
	}

	format(time) {
		if (time > 864e5) {
			return moment.duration(time).format('d[d] H[h]', { trim: 'both mid' });
		} else if (time > 36e5) {
			return moment.duration(time).format('H[h] m[m]', { trim: 'both mid' });
		}
		return moment.duration(time).format('m[m] s[s]', { trim: 'both mid' });
	}

	async aggregationQuery(clan) {
		const db = mongodb.db('clashperk').collection('lastonlines');
		const collection = await db.aggregate([
			{
				$match: {
					'clan.tag': clan.tag,
					tag: { $in: [...clan.memberList.map(m => m.tag)] }
				}
			},
			{
				$project: {
					clan: '$clan',
					tag: '$tag',
					lastSeen: '$lastSeen',
					timestamps: {
						$filter: {
							input: '$timestamps',
							as: 'time',
							cond: {
								$gte: ['$$time', new Date(new Date().getTime() - (24 * 60 * 60 * 1000))]
							}
						}
					}
				}
			},
			{
				$project: {
					clan: '$clan',
					tag: '$tag',
					lastSeen: '$lastSeen',
					size: {
						$size: '$timestamps'
					}
				}
			},
			{
				$group: {
					_id: '$clan',
					members: {
						$addToSet: {
							count: '$size',
							tag: '$tag',
							lastSeen: '$lastSeen'
						}
					}
				}
			}
		]).toArray();
		return this.filter(clan, collection[0]);
	}
}

module.exports = LastOnlineCommand;
