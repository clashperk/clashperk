const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-duration-format');
const Resolver = require('../../struct/Resolver');
const { emoji } = require('../../util/emojis');

class WarlogCommand extends Command {
	constructor() {
		super('warlog', {
			aliases: ['warlog', 'wl'],
			category: 'cwl',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows your clan war log.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
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
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setDescription([
				'\u200e',
				`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses} losses,` : ''} win streak ${data.warWinStreak}`
					.padEnd(50, '\u200b \u2002'),
				'\u200f',
				'\u200e',
				'\u200b'
			].join(' '));

		if (data.isWarLogPublic === false) {
			embed.setDescription('War Log is Private');
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/warlog?limit=10`, {
			method: 'GET',
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
		}).then(res => res.json());

		for (const item of body.items) {
			const { clan, opponent } = item;
			const time = this.format(Date.now() - new Date(moment(item.endTime).toDate()).getTime());
			embed.addField(`\u200e**${this.result(item.result)} ${opponent?.name ?? 'Clan War League'}**`, [
				`${emoji.star_small} \`\u200e${this.padStart(clan.stars)} / ${this.padEnd(opponent.stars)}\u200f\`\u200e ${emoji.fire_small} ${clan.destructionPercentage.toFixed(2)}% ${opponent.name ? `/ ${opponent.destructionPercentage.toFixed(2)}` : ''}`,
				`${emoji.users_small} \`\u200e${this.padStart(item.teamSize)} / ${this.padEnd(item.teamSize)}\u200f\`\u200e ${emoji.clock_small} ${time} ago ${emoji.attacksword} ${clan.attacks}`
			]);
		}

		return message.util.send({ embed });
	}

	result(result) {
		if (result === 'win') return `${emoji.ok}`;
		if (result === 'lose') return `${emoji.wrong}`;
		if (result === 'tie') return `${emoji.empty}`;
		return `${emoji.empty}`;
	}

	padEnd(num) {
		return num.toString().padEnd(3, '\u2002');
	}

	padStart(num) {
		return num.toString().padStart(3, '\u2002');
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

module.exports = WarlogCommand;
