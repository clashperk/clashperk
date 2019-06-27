const { Command } = require('discord-akairo');

class VoteCommand extends Command {
	constructor() {
		super('vote', {
			aliases: ['vote'],
			category: 'fun',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Gives you the link to vote for ClashPerks.'
			}
		});
	}

	exec(message) {
		return message.util.send([
			'**If you want to support ClashPerks, you can vote for the bot under this link.**',
			'https://discordbots.org/bot/526971716711350273/vote'
		]);
	}
}

module.exports = VoteCommand;
