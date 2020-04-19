const { Command } = require('discord-akairo');
const { firebase } = require('../../struct/Database');
const { emoji } = require('../../util/emojis');

class LeaderboardCommand extends Command {
	constructor() {
		super('leaderboard', {
			// aliases: ['levels', 'leaderboard'],
			category: 'other',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows the leaderboard ([vote](https://top.gg/bot/526971716711350273/vote) based).'
			},
			args: [
				{
					id: 'page',
					type: 'number',
					default: 1
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { page }) {
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor('Leaderboard');
		const leaderboard = await this.leaderboard(page);
		let index = (leaderboard.page - 1) * 10;
		for (const { user, level, xp } of leaderboard.items) {
			embed.addField(`**${++index}**. ${this.client.users.cache.get(user).tag}`, [
				`${Array(4).fill('\u200b').join(' ')} 🏷️\`LEVEL ${level}\` ${emoji.fire}\`EXP ${xp}\``
			]);
		}
		embed.setFooter(`Page ${leaderboard.page}/${leaderboard.maxPage}`);
		return message.util.send({ embed });
	}

	async leaderboard(page) {
		const data = await firebase.ref('ranks')
			.once('value')
			.then(snap => snap.val());
		const leaderboard = [];
		for (const [key, value] of this.entries(data)) {
			if (!this.client.users.cache.has(key)) continue;
			const { level } = this.client.voter.getLevel(value.xp);
			leaderboard.push({ user: key, xp: value.xp, level });
		}

		return this.paginate(this.sort(leaderboard), page);
	}

	entries(object) {
		if (!object) return [];
		return Object.entries(object);
	}

	sort(items) {
		return items.sort((a, b) => b.xp - a.xp);
	}

	paginate(items, page = 1, pageLength = 10) {
		const maxPage = Math.ceil(items.length / pageLength);
		if (page < 1) page = 1;
		if (page > maxPage) page = maxPage;
		const startIndex = (page - 1) * pageLength;

		return {
			items: items.length > pageLength ? items.slice(startIndex, startIndex + pageLength) : items,
			page, maxPage, pageLength
		};
	}
}

module.exports = LeaderboardCommand;
