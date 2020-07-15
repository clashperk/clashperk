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
					await message.util.send({ embed: resolved.embed });
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
		const db = mongodb.db('clashperk').collection('lastonlines');
		const prefix = this.handler.prefix(message);
		const clan = await db.findOne({ tag: data.tag });
		if (!clan) {
			return message.util.send({
				embed: {
					description: [
						'Setup a clan last-online board to use this command.',
						`Type \`${prefix}help onlineboard\` to know more.`
					].join(' ')
				}
			});
		}

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				`Last Online Board [${data.members}/50]`,
				`\`\`\`\u200e${'Last On'.padStart(7, ' ')}   ${'Name'}\n${this.filter(data, clan)
					.map(m => `${m.lastOnline ? this.format(m.lastOnline + 1e3).padStart(7, ' ') : ''.padStart(7, ' ')}   ${m.name}`)
					.join('\n')}\`\`\``
			]);

		return message.util.send({ embed });
	}

	padEnd(data) {
		return data.padEnd(20, ' ');
	}

	filter(data, clan) {
		if (data && !data.members) {
			return clan.memberList.map(member => ({ tag: member.tag, name: member.name, lastOnline: null }));
		}
		const members = data.memberList.map(member => {
			const lastOnline = member.tag in clan.members
				? new Date() - new Date(clan.members[member.tag].lastOnline)
				: null;
			return { tag: member.tag, name: member.name, lastOnline };
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
