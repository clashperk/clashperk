const { Command } = require('discord-akairo');

class VoteCommand extends Command {
	constructor() {
		super('vote', {
			aliases: ['vote'],
			category: 'other',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Gives you the link to [vote](https://discordbots.org/bot/526971716711350273/vote) for ClashPerk.'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	exec(message) {
		this.client.voter.fetchVote(message.author.id);
		return message.util.send([
			'**Thanks for voting in advance!**',
			'https://top.gg/bot/526971716711350273/vote'
		]);
	}
}

module.exports = VoteCommand;
