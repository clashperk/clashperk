const { Command } = require('discord-akairo');

class GuideCommand extends Command {
	constructor() {
		super('guide', {
			aliases: ['guide'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows information about how to use bot.' }
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message) {
		return message.util.send('https://clashperk.xyz/');
	}
}

module.exports = GuideCommand;
