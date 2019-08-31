const { Command } = require('discord-akairo');

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
		const embed = await this.client.voter.leaderboard();
		return message.util.send({ embed });
	}
}

module.exports = LeaderboardCommand;
