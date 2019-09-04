const { Command } = require('discord-akairo');
const { firebase } = require('../../struct/Database');

class LeaderboardCommand extends Command {
	constructor() {
		super('leaderboard', {
			aliases: ['levels', 'leaderboard'],
			category: 'other',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows the leaderboard ([vote](https://discordbots.org/bot/526971716711350273/vote) based).'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message) {
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor('Leaderboard');
		let index = 0;
		for (const { user, level, xp } of await this.leaderboard()) {
			embed.addField(`**${++index}**. ${this.client.users.get(user).tag}`, [
				`${Array(4).fill('\u200b').join(' ')} 🏷️\`LEVEL ${level}\` \\🔥\`EXP ${xp}\``
			]);
		}

		return message.util.send({ embed });
	}

	async leaderboard() {
		const data = await firebase.ref('ranks')
			.once('value')
			.then(snap => snap.val());
		const leaderboard = [];
		for (const [key, value] of this.entries(data)) {
			if (!this.client.users.has(key)) continue;
			const { level } = this.client.voter.getLevel(value.xp);
			leaderboard.push({ user: key, xp: value.xp, level });
		}

		return this.sort(leaderboard).splice(0, 10);
	}

	entries(object) {
		if (!object) return [];
		return Object.entries(object);
	}
}

module.exports = LeaderboardCommand;
