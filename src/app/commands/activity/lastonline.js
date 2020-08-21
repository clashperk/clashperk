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
		const db = await mongodb.db('clashperk')
			.collection('lastonlines')
			.find({ tag: data.tag })
			.toArray()
			.then(collection => {
				if (!collection.length) return null;
				const item = collection.find(d => d.guild === message.guild.id);
				if (item) return item;
				return collection[0];
			});
		if (!db) {
			return message.util.send({
				embed: { description: 'Setup a last-online board to use this command.' }
			});
		}

		const members = this.filter(data, db);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'Last-Online Times & Last 24h \\📊 Activities',
				`\`\`\`\u200e${'LAST-ON'.padStart(7, ' ')}  📊  ${'NAME'}\n${members
					.map(m => `${m.lastOnline ? this.format(m.lastOnline + 1e3).padStart(7, ' ') : ''.padStart(7, ' ')}  ${(m.count > 99 ? 99 : m.count).toString().padStart(2, ' ')}  ${m.name}`)
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

	filter(data, db) {
		if (data && !data.members) {
			return data.memberList.map(member => ({ tag: member.tag, name: member.name, lastOnline: null, count: 0 }));
		}

		const members = data.memberList.map(member => {
			const counts = [];
			if (member.tag in db.members && db.members[member.tag].activities) {
				for (const [key, value] of Object.entries(db.members[member.tag].activities)) {
					if (new Date().getTime() - new Date(key).getTime() <= 864e5) {
						counts.push(value);
					}
				}
			}

			return {
				tag: member.tag,
				name: member.name,
				lastOnline: member.tag in db.members
					? new Date() - new Date(db.members[member.tag].lastOnline)
					: null,
				count: counts.reduce((p, c) => p + c, 0)
			};
		});

		const sorted = members.sort((a, b) => a.lastOnline - b.lastOnline);
		return sorted.filter(item => item.lastOnline).concat(sorted.filter(item => !item.lastOnline));
	}

	format(time) {
		if (time > 864e5) {
			return moment.duration(time).format('d[d] H[h]', { trim: 'both mid' });
		} else if (time > 36e5) {
			return moment.duration(time).format('H[h] m[m]', { trim: 'both mid' });
		}
		return moment.duration(time).format('m[m] s[s]', { trim: 'both mid' });
	}
}

module.exports = LastOnlineCommand;
